import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import {
  JOB_NAMES,
  QUEUE_NAMES,
  queuePrefix,
  type DocumentEmbedJob,
  type SearchExecuteJob,
  type SourceIndexJob,
} from '@nexiora/shared';
import { injectQueueContext } from '@nexiora/telemetry';
import { AppConfigService } from '../../bootstrap/app-config.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly connection: IORedis;
  private readonly searchQueue: Queue;
  private readonly ingestionQueue: Queue;
  private readonly embeddingsQueue: Queue;
  private readonly maintenanceQueue: Queue;

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.connection = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    this.connection.on('error', (error) => {
      if (process.env.LOG_LEVEL === 'debug') {
        this.logger.warn(`Queue Redis error: ${error.message}`);
      }
    });

    const prefix = queuePrefix(config.queuePrefixEnv);
    const shared = { connection: this.connection, prefix };
    this.searchQueue = new Queue(QUEUE_NAMES.SEARCH_EXECUTION, shared);
    this.ingestionQueue = new Queue(QUEUE_NAMES.SOURCE_INGESTION, shared);
    this.embeddingsQueue = new Queue(QUEUE_NAMES.EMBEDDINGS, shared);
    this.maintenanceQueue = new Queue(QUEUE_NAMES.MAINTENANCE, shared);
  }

  async enqueueSearchExecute(job: SearchExecuteJob): Promise<boolean> {
    return this.enqueue({
      queue: this.searchQueue,
      queueName: QUEUE_NAMES.SEARCH_EXECUTION,
      jobName: JOB_NAMES.SEARCH_EXECUTE,
      jobId: job.searchId,
      aggregateId: job.searchId,
      payload: job,
      attempts: 3,
      backoffMs: 2000,
    });
  }

  async enqueueSourceIndex(job: SourceIndexJob): Promise<boolean> {
    return this.enqueue({
      queue: this.ingestionQueue,
      queueName: QUEUE_NAMES.SOURCE_INGESTION,
      jobName: JOB_NAMES.SOURCE_INDEX,
      jobId: `${job.sourceDocumentId}-${job.contentHash}`,
      aggregateId: job.sourceDocumentId,
      payload: job,
      attempts: 5,
      backoffMs: 3000,
    });
  }

  async enqueueDocumentEmbed(job: DocumentEmbedJob): Promise<boolean> {
    return this.enqueue({
      queue: this.embeddingsQueue,
      queueName: QUEUE_NAMES.EMBEDDINGS,
      jobName: JOB_NAMES.DOCUMENT_EMBED,
      jobId: `${job.sourceDocumentId}-${job.contentHash}-${job.model}`,
      aggregateId: job.sourceDocumentId,
      payload: job,
      attempts: 6,
      backoffMs: 4000,
    });
  }

  async dispatchPendingOutbox(batchSize = 50): Promise<number> {
    if (!(await this.prisma.isHealthy())) return 0;
    const pending = await this.prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING',
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    let dispatched = 0;
    for (const event of pending) {
      try {
        const queue = this.queueByName(event.queueName);
        await queue.add(event.jobName, event.payload, {
          jobId: event.jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { age: 86_400, count: 1000 },
          removeOnFail: { age: 7 * 86_400 },
        });
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'DISPATCHED',
            dispatchedAt: new Date(),
            attempts: { increment: 1 },
          },
        });
        dispatched += 1;
      } catch (error) {
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'FAILED',
            attempts: { increment: 1 },
            lastError: (error as Error).message.slice(0, 500),
            availableAt: new Date(Date.now() + 15_000),
          },
        });
      }
    }
    return dispatched;
  }

  private async enqueue(input: {
    queue: Queue;
    queueName: string;
    jobName: string;
    jobId: string;
    aggregateId: string;
    payload: unknown;
    attempts: number;
    backoffMs: number;
  }): Promise<boolean> {
    const payloadWithTrace = injectQueueContext({
      ...(input.payload as Record<string, unknown>),
    });

    try {
      if (await this.prisma.isHealthy()) {
        await this.prisma.outboxEvent.upsert({
          where: {
            queueName_jobId: {
              queueName: input.queueName,
              jobId: input.jobId,
            },
          },
          create: {
            aggregateId: input.aggregateId,
            queueName: input.queueName,
            jobName: input.jobName,
            jobId: input.jobId,
            payload: payloadWithTrace as object,
          },
          update: {
            payload: payloadWithTrace as object,
            status: 'PENDING',
            availableAt: new Date(),
            lastError: null,
          },
        });
      }

      await input.queue.add(input.jobName, payloadWithTrace, {
        jobId: input.jobId,
        attempts: input.attempts,
        backoff: { type: 'exponential', delay: input.backoffMs },
        removeOnComplete: { age: 86_400, count: 1000 },
        removeOnFail: { age: 7 * 86_400 },
      });

      if (await this.prisma.isHealthy()) {
        await this.prisma.outboxEvent.updateMany({
          where: { queueName: input.queueName, jobId: input.jobId, status: 'PENDING' },
          data: { status: 'DISPATCHED', dispatchedAt: new Date() },
        });
      }
      return true;
    } catch (error) {
      this.logger.warn(`Failed to enqueue ${input.jobName}: ${(error as Error).message}`);
      return false;
    }
  }

  private queueByName(name: string): Queue {
    switch (name) {
      case QUEUE_NAMES.SEARCH_EXECUTION:
        return this.searchQueue;
      case QUEUE_NAMES.SOURCE_INGESTION:
        return this.ingestionQueue;
      case QUEUE_NAMES.EMBEDDINGS:
        return this.embeddingsQueue;
      case QUEUE_NAMES.MAINTENANCE:
        return this.maintenanceQueue;
      default:
        throw new Error(`Unknown queue: ${name}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.allSettled([
      this.searchQueue.close(),
      this.ingestionQueue.close(),
      this.embeddingsQueue.close(),
      this.maintenanceQueue.close(),
      this.connection.quit(),
    ]);
  }
}

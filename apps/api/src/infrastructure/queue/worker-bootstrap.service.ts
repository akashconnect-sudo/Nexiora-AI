import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import {
  JOB_NAMES,
  QUEUE_NAMES,
  SearchExecuteJobSchema,
  SourceIndexJobSchema,
  DocumentEmbedJobSchema,
  IndexReconcileJobSchema,
  OutboxDispatchJobSchema,
  queuePrefix,
} from '@nexiora/shared';
import { withQueueContext } from '@nexiora/telemetry';
import { AppConfigService } from '../../bootstrap/app-config.service';
import { SearchPipelineService } from '../../modules/search/application/search-pipeline.service';
import { DocumentIndexingService } from '../../modules/search/infrastructure/indexing/document-indexing.service';
import { QueueService } from './queue.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkerBootstrapService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerBootstrapService.name);
  private readonly workers: Worker[] = [];
  private connection: IORedis | null = null;
  private outboxTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: AppConfigService,
    private readonly pipeline: SearchPipelineService,
    private readonly indexing: DocumentIndexingService,
    private readonly queues: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.connection = new IORedis(this.config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    const prefix = queuePrefix(this.config.queuePrefixEnv);
    const concurrency = this.config.workerConcurrency;

    this.workers.push(
      new Worker(
        QUEUE_NAMES.SEARCH_EXECUTION,
        async (job) => {
          const parsed = SearchExecuteJobSchema.parse(job.data);
          await withQueueContext(parsed, JOB_NAMES.SEARCH_EXECUTE, async () => {
            await this.pipeline.run(parsed.searchId);
          });
        },
        { connection: this.connection, prefix, concurrency },
      ),
    );

    this.workers.push(
      new Worker(
        QUEUE_NAMES.SOURCE_INGESTION,
        async (job) => {
          if (job.name === JOB_NAMES.SOURCE_INDEX) {
            const parsed = SourceIndexJobSchema.parse(job.data);
            await withQueueContext(parsed, JOB_NAMES.SOURCE_INDEX, async () => {
              const existing = await this.prisma.sourceDocument.findUnique({
                where: { id: parsed.sourceDocumentId },
              });
              if (!existing) {
                this.logger.warn(`Source document ${parsed.sourceDocumentId} missing; skipping`);
                return;
              }
              await this.indexing.indexLexical(parsed.sourceDocumentId, parsed.contentHash);
            });
            return;
          }
          if (job.name === JOB_NAMES.INDEX_RECONCILE) {
            const parsed = IndexReconcileJobSchema.parse(job.data);
            await this.indexing.reconcile(parsed.limit);
          }
        },
        { connection: this.connection, prefix, concurrency: Math.max(1, concurrency - 1) },
      ),
    );

    this.workers.push(
      new Worker(
        QUEUE_NAMES.EMBEDDINGS,
        async (job) => {
          const parsed = DocumentEmbedJobSchema.parse(job.data);
          await withQueueContext(parsed, JOB_NAMES.DOCUMENT_EMBED, async () => {
            await this.indexing.embedAndUpsert(
              parsed.sourceDocumentId,
              parsed.contentHash,
              parsed.model,
            );
          });
        },
        { connection: this.connection, prefix, concurrency: 1 },
      ),
    );

    this.workers.push(
      new Worker(
        QUEUE_NAMES.MAINTENANCE,
        async (job) => {
          if (job.name === JOB_NAMES.OUTBOX_DISPATCH) {
            const parsed = OutboxDispatchJobSchema.parse(job.data);
            await this.queues.dispatchPendingOutbox(parsed.batchSize);
          }
        },
        { connection: this.connection, prefix, concurrency: 1 },
      ),
    );

    for (const worker of this.workers) {
      worker.on('failed', (job, error) => {
        this.logger.warn(`Job ${job?.name ?? 'unknown'} failed: ${error.message}`);
      });
    }

    this.outboxTimer = setInterval(() => {
      void this.queues.dispatchPendingOutbox(50);
    }, 10_000);
    this.outboxTimer.unref?.();

    this.logger.log(`Registered ${this.workers.length} BullMQ workers`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.outboxTimer) clearInterval(this.outboxTimer);
    await Promise.allSettled(this.workers.map((worker) => worker.close()));
    if (this.connection) await this.connection.quit();
  }
}

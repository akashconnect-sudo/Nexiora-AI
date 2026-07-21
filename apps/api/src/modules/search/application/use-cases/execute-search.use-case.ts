import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { normalizeQuery } from '@nexiora/search-core';
import { CreateSearchRequestSchema, ERROR_CODES } from '@nexiora/shared';
import { DomainError } from '../../../../common/errors/domain-error';
import { EntitlementsService } from '../../../entitlements/application/entitlements.service';
import { hashIp } from '../../../entitlements/domain/entitlements';
import { AppConfigService } from '../../../../bootstrap/app-config.service';
import { QueueService } from '../../../../infrastructure/queue/queue.service';
import { classifyIntent } from '../../domain/classify-intent';
import type { SearchRecord } from '../../domain/search.types';
import { SEARCH_REPOSITORY_PORT, type SearchRepositoryPort } from '../ports/search-repository.port';
import { SearchPipelineService } from '../search-pipeline.service';

export interface ExecuteSearchCommand {
  readonly body: unknown;
  readonly userId: string | null;
  readonly ip: string;
  readonly userAgent: string | null;
  readonly client: string;
}

@Injectable()
export class ExecuteSearchUseCase {
  private readonly logger = new Logger(ExecuteSearchUseCase.name);

  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly config: AppConfigService,
    private readonly queues: QueueService,
    private readonly pipeline: SearchPipelineService,
    @Inject(SEARCH_REPOSITORY_PORT) private readonly repo: SearchRepositoryPort,
  ) {}

  async execute(
    command: ExecuteSearchCommand,
  ): Promise<SearchRecord & { quota: { limitType: 'lifetime' | 'daily'; remaining: number } }> {
    const parsed = CreateSearchRequestSchema.safeParse(command.body);
    if (!parsed.success) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_ERROR,
        parsed.error.issues[0]?.message ?? 'Invalid search request',
        400,
      );
    }

    const ctx = await this.entitlements.resolveContext(command.userId, command.ip);
    const quota = await this.entitlements.assertSearchAllowed(ctx);

    const request = parsed.data;
    const id = randomUUID();
    const normalized = normalizeQuery(request.query);
    const intent = classifyIntent(request.query, request.mode);

    const record = await this.repo.create({
      id,
      query: request.query,
      normalizedQuery: normalized,
      intent,
      mode: request.mode,
      filters: request.filters,
      creatorMode: request.options?.creatorMode ?? false,
      isPrivate: request.options?.private ?? false,
      userId: command.userId,
      client: command.client,
      ipHash: hashIp(command.ip, this.config.ipHashSecret),
      userAgent: command.userAgent,
    });

    if (this.config.searchExecutionMode === 'queue') {
      const enqueued = await this.queues.enqueueSearchExecute({
        version: 1,
        searchId: record.id,
        requestedAt: new Date().toISOString(),
      });
      if (!enqueued) {
        this.logger.warn(`Queue unavailable for ${record.id}; falling back to inline pipeline`);
        void this.pipeline.run(record.id).catch((error) => {
          this.logger.error(`Inline fallback failed for ${record.id}`, error);
        });
      }
    } else {
      void this.pipeline.run(record.id).catch((error) => {
        this.logger.error(`Search pipeline failed for ${record.id}`, error);
      });
    }

    return { ...record, quota };
  }
}

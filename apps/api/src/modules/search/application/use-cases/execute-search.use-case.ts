import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { dedupeDocuments, normalizeQuery, rankDocuments } from '@nexiora/search-core';
import { CreateSearchRequestSchema, ERROR_CODES, cleanDisplayText } from '@nexiora/shared';
import { DomainError } from '../../../../common/errors/domain-error';
import { EntitlementsService } from '../../../entitlements/application/entitlements.service';
import { hashIp } from '../../../entitlements/domain/entitlements';
import { AppConfigService } from '../../../../bootstrap/app-config.service';
import { classifyIntent } from '../../domain/classify-intent';
import { applySourceTrustBoost } from '../../domain/source-trust';
import type { SearchCitation, SearchRecord } from '../../domain/search.types';
import {
  GENERATION_PORT,
  type GenerationChunk,
  type GenerationPort,
} from '../ports/generation.port';
import {
  RETRIEVAL_ADAPTERS,
  type RetrievalAdapter,
} from '../ports/retrieval-adapter.port';
import {
  SEARCH_REPOSITORY_PORT,
  type SearchRepositoryPort,
} from '../ports/search-repository.port';
import { SEARCH_EVENT_BUS, SearchEventBus } from '../search-event-bus';

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
    @Inject(SEARCH_REPOSITORY_PORT) private readonly repo: SearchRepositoryPort,
    @Inject(RETRIEVAL_ADAPTERS) private readonly adapters: RetrievalAdapter[],
    @Inject(GENERATION_PORT) private readonly generator: GenerationPort,
    @Inject(SEARCH_EVENT_BUS) private readonly events: SearchEventBus,
  ) {}

  async execute(command: ExecuteSearchCommand): Promise<SearchRecord> {
    const parsed = CreateSearchRequestSchema.safeParse(command.body);
    if (!parsed.success) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_ERROR,
        parsed.error.issues[0]?.message ?? 'Invalid search request',
        400,
      );
    }

    const ctx = await this.entitlements.resolveContext(command.userId, command.ip);
    await this.entitlements.assertSearchAllowed(ctx);

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

    // Run pipeline asynchronously; caller receives 202-style record immediately.
    void this.runPipeline(record.id, request.query, intent, request.filters).catch((error) => {
      this.logger.error(`Search pipeline failed for ${record.id}`, error);
    });

    return record;
  }

  private async runPipeline(
    searchId: string,
    query: string,
    intent: string,
    filters: SearchRecord['filters'],
  ): Promise<void> {
    const started = Date.now();
    try {
      await this.repo.updateStatus(searchId, 'retrieving');
      this.events.publish(searchId, { type: 'search.status', status: 'retrieving' });

      const settled = await Promise.allSettled(
        this.adapters.map((adapter) => adapter.retrieve(query, filters)),
      );

      const docs = settled.flatMap((result, index) => {
        if (result.status === 'fulfilled') return result.value;
        this.logger.warn(
          `Adapter ${this.adapters[index]?.name} failed: ${String(result.reason)}`,
        );
        return [];
      });

      const ranked = rankDocuments(
        dedupeDocuments(docs).map((doc) => applySourceTrustBoost(doc)),
        {
          freshnessWeight: intent === 'news' ? 0.35 : 0.2,
          trustWeight: intent === 'research' ? 0.45 : 0.35,
          relevanceWeight: 0.45,
        },
      );

      const citations: SearchCitation[] = ranked.slice(0, 10).map((doc, index) => ({
        ordinal: index + 1,
        title: cleanDisplayText(doc.title),
        url: doc.url,
        canonicalUrl: doc.canonicalUrl,
        snippet: cleanDisplayText(doc.snippet),
        domain: doc.domain,
        sourceType: doc.sourceType,
        isOfficial: doc.isOfficial,
        trustScore: doc.trustScore,
        confidence: Math.round(doc.finalScore * 100),
        publishedAt: doc.publishedAt?.toISOString(),
        author: doc.author,
        language: doc.language,
      }));

      this.events.publish(searchId, { type: 'search.citations', citations });
      await this.repo.updateStatus(searchId, 'generating');
      this.events.publish(searchId, { type: 'search.status', status: 'generating' });

      const generation = await this.generator.generate(
        { query, intent, documents: ranked },
        async (chunk: GenerationChunk) => {
          this.events.publish(searchId, {
            type: 'search.token',
            field: chunk.field,
            text: chunk.text,
          });
        },
      );

      this.events.publish(searchId, {
        type: 'search.enrichment',
        key: 'relatedQuestions',
        data: generation.relatedQuestions,
      });
      this.events.publish(searchId, {
        type: 'search.enrichment',
        key: 'betterQueries',
        data: generation.betterQueries,
      });

      const status = citations.length === 0 ? 'partial' : 'completed';
      await this.repo.complete(searchId, {
        status,
        answer: {
          summary: generation.summary,
          detailedMarkdown: generation.detailedMarkdown,
          confidence: generation.confidence,
          model: generation.model,
          language: 'en',
          verificationStatus: citations.length >= 2 ? 'partial' : 'unverified',
        },
        citations,
        relatedQuestions: generation.relatedQuestions,
        betterQueries: generation.betterQueries,
        latencyMs: Date.now() - started,
      });

      this.events.publish(searchId, { type: 'search.done', searchId });
    } catch (error) {
      const message = (error as Error).message;
      await this.repo.updateStatus(searchId, 'failed', message);
      this.events.publish(searchId, {
        type: 'search.error',
        code: ERROR_CODES.SEARCH_FAILED,
        message,
      });
    }
  }
}

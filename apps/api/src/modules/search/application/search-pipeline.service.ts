import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  dedupeDocuments,
  rankDocuments,
  reciprocalRankFusion,
  type RetrievedDocument,
} from '@nexiora/search-core';
import { ERROR_CODES, cleanDisplayText } from '@nexiora/shared';
import { AppConfigService } from '../../../bootstrap/app-config.service';
import { applySourceTrustBoost } from '../domain/source-trust';
import type { SearchCitation, SearchRecord } from '../domain/search.types';
import {
  GENERATION_PORT,
  type GenerationChunk,
  type GenerationPort,
} from './ports/generation.port';
import { RETRIEVAL_ADAPTERS, type RetrievalAdapter } from './ports/retrieval-adapter.port';
import { SEARCH_REPOSITORY_PORT, type SearchRepositoryPort } from './ports/search-repository.port';
import { SEARCH_EVENT_BUS, type SearchEventBus } from './search-event-bus';
import { INDEXED_RETRIEVAL_ADAPTER } from './ports/indexed-retrieval.port';
import { DocumentIndexingService } from '../infrastructure/indexing/document-indexing.service';

@Injectable()
export class SearchPipelineService {
  private readonly logger = new Logger(SearchPipelineService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly indexing: DocumentIndexingService,
    @Inject(SEARCH_REPOSITORY_PORT) private readonly repo: SearchRepositoryPort,
    @Inject(RETRIEVAL_ADAPTERS) private readonly adapters: RetrievalAdapter[],
    @Inject(GENERATION_PORT) private readonly generator: GenerationPort,
    @Inject(SEARCH_EVENT_BUS) private readonly events: SearchEventBus,
    @Optional()
    @Inject(INDEXED_RETRIEVAL_ADAPTER)
    private readonly indexedRetrieval: RetrievalAdapter | null,
  ) {}

  async run(searchId: string): Promise<void> {
    const record = await this.repo.findById(searchId);
    if (!record) {
      throw new Error(`Search session ${searchId} was not found`);
    }
    if (
      record.status === 'completed' ||
      record.status === 'partial' ||
      record.status === 'failed'
    ) {
      return;
    }

    await this.runPipeline(record);
  }

  private async runPipeline(record: SearchRecord): Promise<void> {
    const started = Date.now();
    const searchId = record.id;
    try {
      await this.repo.updateStatus(searchId, 'retrieving');
      this.events.publish(searchId, { type: 'search.status', status: 'retrieving' });

      const settled = await Promise.allSettled(
        this.adapters.map((adapter) => adapter.retrieve(record.query, record.filters)),
      );

      const liveDocs = settled.flatMap((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value.map((doc) => ({ ...doc, origin: 'live' as const }));
        }
        this.logger.warn(`Adapter ${this.adapters[index]?.name} failed: ${String(result.reason)}`);
        return [];
      });

      let indexedDocs: Array<RetrievedDocument & { origin: 'index' }> = [];
      const readMode = this.config.searchIndexReadMode;
      if (readMode !== 'off' && this.indexedRetrieval) {
        try {
          const docs = await this.indexedRetrieval.retrieve(record.query, record.filters);
          indexedDocs = docs.map((doc) => ({ ...doc, origin: 'index' as const }));
          if (readMode === 'shadow') {
            this.logger.debug(
              `Shadow indexed retrieval returned ${indexedDocs.length} docs for ${searchId}`,
            );
          }
        } catch (error) {
          this.logger.warn(`Indexed retrieval failed: ${(error as Error).message}`);
        }
      }

      const combined =
        readMode === 'on'
          ? fuseLiveAndIndexed(liveDocs, indexedDocs)
          : liveDocs.map((doc) => applySourceTrustBoost(doc));

      const ranked = rankDocuments(dedupeDocuments(combined), {
        freshnessWeight: record.intent === 'news' ? 0.35 : 0.2,
        trustWeight: record.intent === 'research' ? 0.45 : 0.35,
        relevanceWeight: 0.45,
      });

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
        { query: record.query, intent: record.intent, documents: ranked },
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

      if (!record.isPrivate && this.config.searchIndexWriteEnabled) {
        void this.enqueueLiveDocuments(liveDocs);
      }

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

  private async enqueueLiveDocuments(
    docs: Array<RetrievedDocument & { origin: 'live' }>,
  ): Promise<void> {
    for (const doc of docs.slice(0, 20)) {
      try {
        const { id, contentHash } = await this.indexing.upsertSourceDocument({
          title: doc.title,
          url: doc.url,
          canonicalUrl: doc.canonicalUrl,
          snippet: doc.snippet,
          domain: doc.domain,
          sourceType: doc.sourceType,
          isOfficial: doc.isOfficial,
          trustScore: doc.trustScore,
          publishedAt: doc.publishedAt?.toISOString(),
          author: doc.author,
          language: doc.language,
        });
        await this.indexing.enqueueLexicalIndex(id, contentHash);
      } catch (error) {
        this.logger.warn(
          `Index enqueue skipped for ${doc.canonicalUrl}: ${(error as Error).message}`,
        );
      }
    }
  }
}

export function fuseLiveAndIndexed(
  live: Array<RetrievedDocument & { origin: 'live' }>,
  indexed: Array<RetrievedDocument & { origin: 'index' }>,
): RetrievedDocument[] {
  if (!indexed.length) return live.map((doc) => applySourceTrustBoost(doc));
  const liveRanked = live.map((doc) => ({ id: doc.canonicalUrl, doc: doc as RetrievedDocument }));
  const indexedRanked = indexed.map((doc) => ({
    id: doc.canonicalUrl,
    doc: doc as RetrievedDocument,
  }));
  const fused = reciprocalRankFusion([liveRanked, indexedRanked]);
  return fused.map(({ doc }) => applySourceTrustBoost(doc));
}

/** True when a search session should never be written to shared indexes. */
export function shouldIndexSearch(input: {
  isPrivate: boolean;
  writeEnabled: boolean;
}): boolean {
  return !input.isPrivate && input.writeEnabled;
}

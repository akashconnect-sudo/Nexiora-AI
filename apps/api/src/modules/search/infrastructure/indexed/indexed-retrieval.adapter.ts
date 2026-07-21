import { Injectable, Logger } from '@nestjs/common';
import type { RetrievedDocument } from '@nexiora/search-core';
import {
  reciprocalRankFusion,
  stableDocumentId,
} from '@nexiora/search-core';
import type { SearchFilters } from '@nexiora/shared';
import { AppConfigService } from '../../../../bootstrap/app-config.service';
import type { RetrievalAdapter } from '../../application/ports/retrieval-adapter.port';
import { OpenSearchSearchClient } from './opensearch-search.client';
import { QdrantSearchClient } from './qdrant-search.client';
import { OpenAiEmbeddingAdapter } from '../llm/openai-embedding.adapter';

@Injectable()
export class IndexedRetrievalAdapter implements RetrievalAdapter {
  readonly name = 'indexed-composite';
  private readonly logger = new Logger(IndexedRetrievalAdapter.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly openSearch: OpenSearchSearchClient,
    private readonly qdrant: QdrantSearchClient,
    private readonly embeddings: OpenAiEmbeddingAdapter,
  ) {}

  async retrieve(query: string, _filters: SearchFilters): Promise<RetrievedDocument[]> {
    if (this.config.searchIndexReadMode === 'off') return [];

    const timeoutMs = this.config.indexRetrievalTimeoutMs;
    const [lexical, vector] = await Promise.all([
      withTimeout(this.openSearch.search(query, 12), timeoutMs, [] as RetrievedDocument[]),
      this.vectorSearch(query, timeoutMs),
    ]);

    if (!lexical.length && !vector.length) return [];

    const fused = reciprocalRankFusion([
      lexical.map((doc) => ({ id: doc.canonicalUrl, doc })),
      vector.map((doc) => ({ id: doc.canonicalUrl, doc })),
    ]);

    return fused.slice(0, 12).map(({ doc, rrfScore }, index) => ({
      ...doc,
      id: doc.id || stableDocumentId(doc.canonicalUrl),
      relevanceScore: Math.min(1, rrfScore * 10),
      retrievedAt: new Date(),
    }));
  }

  private async vectorSearch(query: string, timeoutMs: number): Promise<RetrievedDocument[]> {
    try {
      const embedding = await withTimeout(this.embeddings.embed(query), timeoutMs, null);
      if (!embedding) return [];
      return await withTimeout(
        this.qdrant.search(embedding, 12),
        timeoutMs,
        [] as RetrievedDocument[],
      );
    } catch (error) {
      this.logger.warn(`Vector retrieval skipped: ${(error as Error).message}`);
      return [];
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { documentContentHash, stableDocumentId } from '@nexiora/search-core';
import type { SourceType } from '@nexiora/shared';
import { AppConfigService } from '../../../../bootstrap/app-config.service';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { QueueService } from '../../../../infrastructure/queue/queue.service';
import { OpenAiEmbeddingAdapter } from '../llm/openai-embedding.adapter';
import { OpenSearchSearchClient } from '../indexed/opensearch-search.client';
import { QdrantSearchClient } from '../indexed/qdrant-search.client';

@Injectable()
export class DocumentIndexingService {
  private readonly logger = new Logger(DocumentIndexingService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly queues: QueueService,
    private readonly openSearch: OpenSearchSearchClient,
    private readonly qdrant: QdrantSearchClient,
    private readonly embeddings: OpenAiEmbeddingAdapter,
  ) {}

  async upsertSourceDocument(input: {
    title: string;
    url: string;
    canonicalUrl: string;
    snippet: string;
    domain: string;
    sourceType: SourceType;
    isOfficial: boolean;
    trustScore: number;
    publishedAt?: string;
    author?: string;
    language?: string;
  }): Promise<{ id: string; contentHash: string }> {
    const id = stableDocumentId(input.canonicalUrl);
    const contentHash = documentContentHash(input);
    if (!(await this.prisma.isHealthy())) {
      return { id, contentHash };
    }

    await this.prisma.sourceDocument.upsert({
      where: { id },
      create: {
        id,
        title: input.title,
        url: input.url,
        canonicalUrl: input.canonicalUrl,
        snippet: input.snippet,
        domain: input.domain,
        sourceType: input.sourceType.toUpperCase() as never,
        isOfficial: input.isOfficial,
        trustScore: input.trustScore,
        contentHash,
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
        author: input.author,
        language: input.language,
      },
      update: {
        title: input.title,
        url: input.url,
        snippet: input.snippet,
        domain: input.domain,
        sourceType: input.sourceType.toUpperCase() as never,
        isOfficial: input.isOfficial,
        trustScore: input.trustScore,
        contentHash,
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
        author: input.author,
        language: input.language,
        openSearchStatus: 'PENDING',
        qdrantStatus: 'PENDING',
        tombstonedAt: null,
      },
    });

    return { id, contentHash };
  }

  async indexLexical(sourceDocumentId: string, contentHash: string): Promise<void> {
    if (!(await this.prisma.isHealthy())) return;
    const doc = await this.prisma.sourceDocument.findUnique({ where: { id: sourceDocumentId } });
    if (!doc || doc.contentHash !== contentHash || doc.tombstonedAt) return;

    await this.openSearch.ensureIndex();
    const ok = await this.openSearch.upsert({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      canonicalUrl: doc.canonicalUrl,
      snippet: doc.snippet,
      domain: doc.domain,
      sourceType: doc.sourceType.toLowerCase(),
      isOfficial: doc.isOfficial,
      trustScore: Number(doc.trustScore),
      contentHash: doc.contentHash,
      publishedAt: doc.publishedAt?.toISOString(),
      author: doc.author,
      language: doc.language,
    });

    await this.prisma.sourceDocument.update({
      where: { id: doc.id },
      data: {
        openSearchStatus: ok ? 'INDEXED' : 'FAILED',
        lastIndexedAt: ok ? new Date() : doc.lastIndexedAt,
      },
    });

    if (ok) {
      await this.queues.enqueueDocumentEmbed({
        version: 1,
        sourceDocumentId: doc.id,
        contentHash: doc.contentHash,
        model: this.config.openaiEmbeddingModel,
      });
    }
  }

  async embedAndUpsert(sourceDocumentId: string, contentHash: string, model: string): Promise<void> {
    if (!(await this.prisma.isHealthy())) return;
    const doc = await this.prisma.sourceDocument.findUnique({ where: { id: sourceDocumentId } });
    if (!doc || doc.contentHash !== contentHash || doc.tombstonedAt) return;
    if (
      doc.qdrantStatus === 'INDEXED' &&
      doc.embeddingModel === model &&
      doc.embeddingDims === this.config.openaiEmbeddingDims
    ) {
      return;
    }

    const vector = await this.embeddings.embed(`${doc.title}\n${doc.snippet}`);
    if (!vector) {
      await this.prisma.sourceDocument.update({
        where: { id: doc.id },
        data: { qdrantStatus: 'FAILED' },
      });
      return;
    }

    await this.qdrant.ensureCollection();
    const ok = await this.qdrant.upsert(doc.id, vector, {
      title: doc.title,
      url: doc.url,
      canonicalUrl: doc.canonicalUrl,
      snippet: doc.snippet,
      domain: doc.domain,
      sourceType: doc.sourceType.toLowerCase(),
      isOfficial: doc.isOfficial,
      trustScore: Number(doc.trustScore),
      contentHash: doc.contentHash,
      publishedAt: doc.publishedAt?.toISOString(),
      author: doc.author,
      language: doc.language,
    });

    await this.prisma.sourceDocument.update({
      where: { id: doc.id },
      data: {
        qdrantStatus: ok ? 'INDEXED' : 'FAILED',
        embeddingModel: ok ? model : doc.embeddingModel,
        embeddingDims: ok ? this.config.openaiEmbeddingDims : doc.embeddingDims,
        lastEmbeddedAt: ok ? new Date() : doc.lastEmbeddedAt,
      },
    });
  }

  async enqueueLexicalIndex(sourceDocumentId: string, contentHash: string): Promise<boolean> {
    return this.queues.enqueueSourceIndex({
      version: 1,
      sourceDocumentId,
      contentHash,
    });
  }

  async reconcile(limit = 50): Promise<number> {
    if (!(await this.prisma.isHealthy())) return 0;
    const pending = await this.prisma.sourceDocument.findMany({
      where: {
        tombstonedAt: null,
        OR: [{ openSearchStatus: 'PENDING' }, { openSearchStatus: 'FAILED' }],
      },
      take: limit,
      orderBy: { updatedAt: 'asc' },
    });
    for (const doc of pending) {
      await this.enqueueLexicalIndex(doc.id, doc.contentHash);
    }
    this.logger.debug(`Reconcile enqueued ${pending.length} documents`);
    return pending.length;
  }
}

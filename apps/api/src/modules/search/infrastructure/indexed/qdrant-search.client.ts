import { Injectable, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { RetrievedDocument } from '@nexiora/search-core';
import { AppConfigService } from '../../../../bootstrap/app-config.service';

@Injectable()
export class QdrantSearchClient {
  private readonly logger = new Logger(QdrantSearchClient.name);
  private readonly client: QdrantClient | null;

  constructor(private readonly config: AppConfigService) {
    try {
      this.client = new QdrantClient({
        url: config.qdrantUrl,
        apiKey: config.qdrantApiKey || undefined,
      });
    } catch (error) {
      this.logger.warn(`Qdrant client unavailable: ${(error as Error).message}`);
      this.client = null;
    }
  }

  async search(vector: number[], limit: number): Promise<RetrievedDocument[]> {
    if (!this.client) return [];
    try {
      const results = await this.client.search(this.config.qdrantCollection, {
        vector,
        limit,
        with_payload: true,
      });
      return results.map((point) => {
        const payload = (point.payload ?? {}) as Record<string, unknown>;
        return {
          id: String(point.id),
          title: String(payload.title ?? ''),
          url: String(payload.url ?? ''),
          canonicalUrl: String(payload.canonicalUrl ?? payload.url ?? ''),
          snippet: String(payload.snippet ?? ''),
          domain: String(payload.domain ?? ''),
          sourceType: (String(payload.sourceType ?? 'web').toLowerCase() as RetrievedDocument['sourceType']),
          isOfficial: Boolean(payload.isOfficial),
          trustScore: Number(payload.trustScore ?? 50),
          relevanceScore: Number(point.score ?? 0.5),
          publishedAt: payload.publishedAt ? new Date(String(payload.publishedAt)) : undefined,
          retrievedAt: new Date(),
          author: payload.author ? String(payload.author) : undefined,
          language: payload.language ? String(payload.language) : undefined,
        };
      });
    } catch (error) {
      this.logger.warn(`Qdrant search failed: ${(error as Error).message}`);
      return [];
    }
  }

  async upsert(id: string, vector: number[], payload: Record<string, unknown>): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.upsert(this.config.qdrantCollection, {
        wait: false,
        points: [{ id, vector, payload }],
      });
      return true;
    } catch (error) {
      this.logger.warn(`Qdrant upsert failed: ${(error as Error).message}`);
      return false;
    }
  }

  async ensureCollection(): Promise<void> {
    if (!this.client) return;
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (collection) => collection.name === this.config.qdrantCollection,
      );
      if (!exists) {
        await this.client.createCollection(this.config.qdrantCollection, {
          vectors: {
            size: this.config.openaiEmbeddingDims,
            distance: 'Cosine',
          },
        });
      }
    } catch (error) {
      this.logger.warn(`Qdrant ensureCollection failed: ${(error as Error).message}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.getCollections();
      return true;
    } catch {
      return false;
    }
  }
}

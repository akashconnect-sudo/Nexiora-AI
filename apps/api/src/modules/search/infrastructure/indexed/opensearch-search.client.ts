import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import type { RetrievedDocument } from '@nexiora/search-core';
import { AppConfigService } from '../../../../bootstrap/app-config.service';

@Injectable()
export class OpenSearchSearchClient {
  private readonly logger = new Logger(OpenSearchSearchClient.name);
  private readonly client: Client | null;

  constructor(private readonly config: AppConfigService) {
    try {
      const auth =
        config.opensearchUsername && config.opensearchPassword
          ? {
              username: config.opensearchUsername,
              password: config.opensearchPassword,
            }
          : undefined;
      this.client = new Client({
        node: config.opensearchNode,
        auth,
        ssl: { rejectUnauthorized: config.isProduction },
      });
    } catch (error) {
      this.logger.warn(`OpenSearch client unavailable: ${(error as Error).message}`);
      this.client = null;
    }
  }

  async search(query: string, size: number): Promise<RetrievedDocument[]> {
    if (!this.client) return [];
    try {
      const response = await this.client.search({
        index: this.config.searchIndexAlias,
        body: {
          size,
          query: {
            multi_match: {
              query,
              fields: ['title^3', 'snippet^2', 'domain'],
            },
          },
        },
      });
      const body = response.body as unknown as {
        hits?: { hits?: Array<{ _id: string; _source?: Record<string, unknown> }> };
      };
      const hits = body.hits?.hits ?? [];
      return hits.map((hit) => {
        const source = hit._source ?? {};
        return {
          id: String(hit._id),
          title: String(source.title ?? ''),
          url: String(source.url ?? ''),
          canonicalUrl: String(source.canonicalUrl ?? source.url ?? ''),
          snippet: String(source.snippet ?? ''),
          domain: String(source.domain ?? ''),
          sourceType: (String(source.sourceType ?? 'web').toLowerCase() as RetrievedDocument['sourceType']),
          isOfficial: Boolean(source.isOfficial),
          trustScore: Number(source.trustScore ?? 50),
          relevanceScore: 0.7,
          publishedAt: source.publishedAt ? new Date(String(source.publishedAt)) : undefined,
          retrievedAt: new Date(),
          author: source.author ? String(source.author) : undefined,
          language: source.language ? String(source.language) : undefined,
        };
      });
    } catch (error) {
      this.logger.warn(`OpenSearch query failed: ${(error as Error).message}`);
      return [];
    }
  }

  async upsert(document: Record<string, unknown>): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.index({
        index: this.config.searchIndexWriteAlias,
        id: String(document.id),
        body: document,
        refresh: false,
      });
      return true;
    } catch (error) {
      this.logger.warn(`OpenSearch upsert failed: ${(error as Error).message}`);
      return false;
    }
  }

  async ensureIndex(): Promise<void> {
    if (!this.client) return;
    const index = 'documents_v1';
    try {
      const exists = await this.client.indices.exists({ index });
      if (!exists.body) {
        await this.client.indices.create({
          index,
          body: {
            settings: { number_of_shards: 1, number_of_replicas: 0 },
            mappings: {
              properties: {
                title: { type: 'text' },
                snippet: { type: 'text' },
                url: { type: 'keyword' },
                canonicalUrl: { type: 'keyword' },
                domain: { type: 'keyword' },
                sourceType: { type: 'keyword' },
                isOfficial: { type: 'boolean' },
                trustScore: { type: 'float' },
                contentHash: { type: 'keyword' },
                publishedAt: { type: 'date' },
                author: { type: 'keyword' },
                language: { type: 'keyword' },
              },
            },
          },
        });
      }
      await this.client.indices.putAlias({ index, name: this.config.searchIndexAlias });
      await this.client.indices.putAlias({ index, name: this.config.searchIndexWriteAlias });
    } catch (error) {
      this.logger.warn(`OpenSearch ensureIndex failed: ${(error as Error).message}`);
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const response = await this.client.cluster.health({ timeout: '1s' });
      const status = String((response.body as { status?: string }).status ?? '');
      return status === 'green' || status === 'yellow';
    } catch {
      return false;
    }
  }
}

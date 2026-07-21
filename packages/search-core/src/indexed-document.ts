import type { SourceType } from '@nexiora/shared';

/**
 * Durable indexed-document payload used by workers and OpenSearch/Qdrant clients.
 */
export interface IndexedDocumentPayload {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly canonicalUrl: string;
  readonly snippet: string;
  readonly domain: string;
  readonly sourceType: SourceType;
  readonly isOfficial: boolean;
  readonly trustScore: number;
  readonly contentHash: string;
  readonly publishedAt?: string;
  readonly author?: string;
  readonly language?: string;
  readonly origin: 'live';
}

export type SearchIndexReadMode = 'off' | 'shadow' | 'on';

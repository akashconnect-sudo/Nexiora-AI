import type { SourceType } from '@nexiora/shared';

/**
 * Normalized document produced by any retrieval adapter.
 */
export interface RetrievedDocument {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly canonicalUrl: string;
  readonly snippet: string;
  readonly domain: string;
  readonly sourceType: SourceType;
  readonly isOfficial: boolean;
  /** Base trust from SourceTrust registry (0–100). */
  readonly trustScore: number;
  /** Lexical/semantic relevance (0–1). */
  readonly relevanceScore: number;
  readonly publishedAt?: Date;
  readonly retrievedAt: Date;
  readonly author?: string;
  readonly language?: string;
}

export interface RankedDocument extends RetrievedDocument {
  /** Final fused score used for ordering (higher is better). */
  readonly finalScore: number;
}

export interface RankOptions {
  /** Prefer fresher content (news / breaking). */
  readonly freshnessWeight?: number;
  /** Prefer official / high-trust sources. */
  readonly trustWeight?: number;
  /** Prefer relevance signals. */
  readonly relevanceWeight?: number;
  readonly now?: Date;
}

import type { SearchFilters, SearchMode, SourceType } from '@nexiora/shared';

export type SearchPipelineStatus =
  'pending' | 'retrieving' | 'generating' | 'completed' | 'failed' | 'partial';

export interface SearchCitation {
  readonly ordinal: number;
  readonly title: string;
  readonly url: string;
  readonly canonicalUrl: string;
  readonly snippet: string;
  readonly domain: string;
  readonly sourceType: SourceType;
  readonly isOfficial: boolean;
  readonly trustScore: number;
  readonly confidence: number;
  readonly publishedAt?: string;
  readonly author?: string;
  readonly language?: string;
}

export interface SearchAnswer {
  readonly summary: string;
  readonly detailedMarkdown: string;
  readonly confidence: number;
  readonly model: string;
  readonly verificationStatus: 'unverified' | 'partial' | 'verified' | 'failed';
  readonly language: string;
}

export interface SearchRecord {
  readonly id: string;
  readonly userId: string | null;
  readonly query: string;
  readonly normalizedQuery: string;
  readonly intent: string;
  readonly mode: SearchMode;
  readonly filters: SearchFilters;
  readonly status: SearchPipelineStatus;
  readonly isPrivate: boolean;
  readonly answer: SearchAnswer | null;
  readonly citations: SearchCitation[];
  readonly relatedQuestions: string[];
  readonly betterQueries: string[];
  readonly latencyMs: number | null;
  readonly errorMessage: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateSearchInput {
  readonly query: string;
  readonly mode: SearchMode;
  readonly filters: SearchFilters;
  readonly creatorMode: boolean;
  readonly isPrivate: boolean;
  readonly userId: string | null;
  readonly client: string;
  readonly ipHash: string | null;
  readonly userAgent: string | null;
}

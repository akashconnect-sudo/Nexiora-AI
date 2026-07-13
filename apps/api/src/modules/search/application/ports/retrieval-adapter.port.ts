import type { RetrievedDocument } from '@nexiora/search-core';
import type { SearchFilters } from '@nexiora/shared';

export interface RetrievalAdapter {
  readonly name: string;
  retrieve(query: string, filters: SearchFilters): Promise<RetrievedDocument[]>;
}

export const RETRIEVAL_ADAPTERS = Symbol('RETRIEVAL_ADAPTERS');

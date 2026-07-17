import type {
  CreateSearchInput,
  SearchRecord,
  SearchPipelineStatus,
  SearchAnswer,
  SearchCitation,
} from '../../domain/search.types';

export interface SearchRepositoryPort {
  create(
    input: CreateSearchInput & { id: string; normalizedQuery: string; intent: string },
  ): Promise<SearchRecord>;
  updateStatus(
    id: string,
    status: SearchPipelineStatus,
    errorMessage?: string | null,
  ): Promise<void>;
  complete(
    id: string,
    data: {
      status: SearchPipelineStatus;
      answer: SearchAnswer;
      citations: SearchCitation[];
      relatedQuestions: string[];
      betterQueries: string[];
      latencyMs: number;
    },
  ): Promise<SearchRecord>;
  findById(id: string): Promise<SearchRecord | null>;
  listHistory(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<{ items: SearchRecord[]; nextCursor: string | null }>;
}

export const SEARCH_REPOSITORY_PORT = Symbol('SEARCH_REPOSITORY_PORT');

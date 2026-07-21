import type { RetrievalAdapter } from './retrieval-adapter.port';

export const INDEXED_RETRIEVAL_ADAPTER = Symbol('INDEXED_RETRIEVAL_ADAPTER');

export type IndexedRetrievalAdapter = RetrievalAdapter;

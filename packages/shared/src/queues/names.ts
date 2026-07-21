/**
 * BullMQ queue names used by API producers and VPS workers.
 * Keep names stable — renaming requires dual-read migration.
 */
export const QUEUE_NAMES = {
  SEARCH_EXECUTION: 'search-execution',
  SOURCE_INGESTION: 'source-ingestion',
  EMBEDDINGS: 'embeddings',
  MAINTENANCE: 'maintenance',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  SEARCH_EXECUTE: 'search.execute.v1',
  SOURCE_INDEX: 'source.index.v1',
  DOCUMENT_EMBED: 'document.embed.v1',
  NEWS_REFRESH: 'news.refresh.v1',
  OUTBOX_DISPATCH: 'outbox.dispatch.v1',
  DATA_CLEANUP: 'data.cleanup.v1',
  INDEX_RECONCILE: 'index.reconcile.v1',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export function queuePrefix(environment: string): string {
  const normalized = environment.trim().toLowerCase() || 'development';
  return `{nexiora:${normalized}}`;
}

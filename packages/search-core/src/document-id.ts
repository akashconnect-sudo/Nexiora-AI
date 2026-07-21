import { createHash } from 'node:crypto';

/**
 * Deterministic UUID derived from a canonical URL.
 * Used as PostgreSQL ID, OpenSearch _id, and Qdrant point ID.
 */
export function stableDocumentId(canonicalUrl: string): string {
  const hash = createHash('sha256').update(canonicalUrl.trim().toLowerCase()).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

/**
 * Content hash for idempotent indexing and re-embedding decisions.
 */
export function documentContentHash(input: {
  title: string;
  snippet: string;
  url: string;
  canonicalUrl: string;
}): string {
  return createHash('sha256')
    .update(
      [
        input.canonicalUrl.trim().toLowerCase(),
        input.url.trim(),
        input.title.trim(),
        input.snippet.trim(),
      ].join('\n'),
    )
    .digest('hex');
}

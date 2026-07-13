import { canonicalizeUrl } from './canonicalize-url';
import type { RetrievedDocument } from './types';

/**
 * Deduplicate documents by canonical URL, keeping the higher-scoring candidate.
 */
export function dedupeDocuments(documents: readonly RetrievedDocument[]): RetrievedDocument[] {
  const bestByUrl = new Map<string, RetrievedDocument>();

  for (const doc of documents) {
    const key = canonicalizeUrl(doc.canonicalUrl || doc.url);
    const existing = bestByUrl.get(key);
    if (!existing) {
      bestByUrl.set(key, { ...doc, canonicalUrl: key });
      continue;
    }

    const existingScore = existing.relevanceScore * 0.6 + existing.trustScore / 100;
    const nextScore = doc.relevanceScore * 0.6 + doc.trustScore / 100;
    if (nextScore > existingScore) {
      bestByUrl.set(key, { ...doc, canonicalUrl: key });
    }
  }

  return [...bestByUrl.values()];
}

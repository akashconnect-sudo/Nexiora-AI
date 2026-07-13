import type { RankOptions, RankedDocument, RetrievedDocument } from './types';

const MS_PER_DAY = 86_400_000;

/**
 * Hybrid rank: relevance + trust + freshness decay.
 * Weights are normalized so callers can bias modes (e.g. news → higher freshness).
 */
export function rankDocuments(
  documents: readonly RetrievedDocument[],
  options: RankOptions = {},
): RankedDocument[] {
  const relevanceWeight = options.relevanceWeight ?? 0.45;
  const trustWeight = options.trustWeight ?? 0.35;
  const freshnessWeight = options.freshnessWeight ?? 0.2;
  const weightSum = relevanceWeight + trustWeight + freshnessWeight;
  const now = options.now ?? new Date();

  const ranked: RankedDocument[] = documents.map((doc) => {
    const freshness = freshnessScore(doc.publishedAt, now);
    const finalScore =
      (doc.relevanceScore * relevanceWeight +
        (doc.trustScore / 100) * trustWeight +
        freshness * freshnessWeight) /
      weightSum;

    const officialBoost = doc.isOfficial ? 0.05 : 0;

    return {
      ...doc,
      finalScore: Math.min(1, finalScore + officialBoost),
    };
  });

  return ranked.sort((a, b) => b.finalScore - a.finalScore);
}

function freshnessScore(publishedAt: Date | undefined, now: Date): number {
  if (!publishedAt) {
    return 0.35;
  }
  const ageDays = Math.max(0, (now.getTime() - publishedAt.getTime()) / MS_PER_DAY);
  if (ageDays <= 1) return 1;
  if (ageDays <= 7) return 0.85;
  if (ageDays <= 30) return 0.65;
  if (ageDays <= 365) return 0.4;
  return 0.2;
}

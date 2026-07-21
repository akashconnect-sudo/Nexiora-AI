/**
 * Reciprocal Rank Fusion for combining lexical (OpenSearch) and vector (Qdrant) rankings.
 * Higher fused score is better.
 */
export function reciprocalRankFusion<T extends { id: string }>(
  rankedLists: T[][],
  k = 60,
): Array<T & { rrfScore: number }> {
  const scores = new Map<string, { item: T; score: number }>();

  for (const list of rankedLists) {
    list.forEach((item, index) => {
      const contribution = 1 / (k + index + 1);
      const existing = scores.get(item.id);
      if (existing) {
        existing.score += contribution;
      } else {
        scores.set(item.id, { item, score: contribution });
      }
    });
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map(({ item, score }) => ({ ...item, rrfScore: score }));
}

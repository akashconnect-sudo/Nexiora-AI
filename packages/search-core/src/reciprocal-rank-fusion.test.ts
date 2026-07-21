import { describe, expect, it } from 'vitest';
import { reciprocalRankFusion } from './reciprocal-rank-fusion';

describe('reciprocalRankFusion', () => {
  it('merges independent ranked lists without dropping either side', () => {
    const fused = reciprocalRankFusion([
      [
        { id: 'a', label: 'lexical-a' },
        { id: 'b', label: 'lexical-b' },
      ],
      [
        { id: 'b', label: 'vector-b' },
        { id: 'c', label: 'vector-c' },
      ],
    ]);

    expect(fused.map((item) => item.id)).toEqual(['b', 'a', 'c']);
    expect(fused[0]?.rrfScore).toBeGreaterThan(fused[1]?.rrfScore ?? 0);
  });

  it('returns empty when both backends are down', () => {
    expect(reciprocalRankFusion([[], []])).toEqual([]);
  });
});

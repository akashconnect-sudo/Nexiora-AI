import { describe, expect, it } from 'vitest';
import { documentContentHash, stableDocumentId } from './document-id';
import { reciprocalRankFusion } from './reciprocal-rank-fusion';

describe('stableDocumentId', () => {
  it('returns a deterministic UUID-shaped id for a canonical URL', () => {
    const a = stableDocumentId('https://example.com/a');
    const b = stableDocumentId('https://example.com/a');
    expect(a).toBe(b);
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe('documentContentHash', () => {
  it('changes when title or snippet changes', () => {
    const base = documentContentHash({
      title: 'One',
      snippet: 'Body',
      url: 'https://example.com/a',
      canonicalUrl: 'https://example.com/a',
    });
    const changed = documentContentHash({
      title: 'Two',
      snippet: 'Body',
      url: 'https://example.com/a',
      canonicalUrl: 'https://example.com/a',
    });
    expect(base).not.toBe(changed);
  });
});

describe('reciprocalRankFusion', () => {
  it('prefers documents that rank highly across both lists', () => {
    const fused = reciprocalRankFusion([
      [{ id: 'b' }, { id: 'a' }, { id: 'c' }],
      [{ id: 'b' }, { id: 'd' }, { id: 'a' }],
    ]);
    expect(fused[0]?.id).toBe('b');
    expect(fused.map((item) => item.id).slice(0, 2)).toEqual(['b', 'a']);
  });
});

import { describe, expect, it } from 'vitest';
import {
  fuseLiveAndIndexed,
  shouldIndexSearch,
} from './search-pipeline.service';
import type { RetrievedDocument } from '@nexiora/search-core';

function doc(id: string, score = 0.8): RetrievedDocument {
  return {
    id,
    title: id,
    url: `https://example.com/${id}`,
    canonicalUrl: `https://example.com/${id}`,
    snippet: `snippet ${id}`,
    domain: 'example.com',
    sourceType: 'web',
    isOfficial: false,
    trustScore: 50,
    relevanceScore: score,
    retrievedAt: new Date(),
  };
}

describe('shouldIndexSearch', () => {
  it('never indexes private searches', () => {
    expect(shouldIndexSearch({ isPrivate: true, writeEnabled: true })).toBe(false);
  });

  it('requires write mode to be enabled', () => {
    expect(shouldIndexSearch({ isPrivate: false, writeEnabled: false })).toBe(false);
    expect(shouldIndexSearch({ isPrivate: false, writeEnabled: true })).toBe(true);
  });
});

describe('fuseLiveAndIndexed', () => {
  it('falls back to live results when the index returns nothing', () => {
    const live = [{ ...doc('live-1'), origin: 'live' as const }];
    const fused = fuseLiveAndIndexed(live, []);
    expect(fused).toHaveLength(1);
    expect(fused[0]?.canonicalUrl).toContain('live-1');
  });

  it('prefers documents present in both live and indexed ranks', () => {
    const shared = doc('shared');
    const live = [
      { ...shared, origin: 'live' as const },
      { ...doc('live-only'), origin: 'live' as const },
    ];
    const indexed = [
      { ...shared, origin: 'index' as const },
      { ...doc('index-only'), origin: 'index' as const },
    ];
    const fused = fuseLiveAndIndexed(live, indexed);
    expect(fused[0]?.canonicalUrl).toContain('shared');
  });
});

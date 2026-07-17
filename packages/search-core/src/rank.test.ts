import { describe, expect, it } from 'vitest';
import { canonicalizeUrl } from './canonicalize-url';
import { dedupeDocuments } from './dedupe-documents';
import { normalizeQuery } from './normalize-query';
import { rankDocuments } from './rank-documents';
import type { RetrievedDocument } from './types';

function doc(
  partial: Partial<RetrievedDocument> & Pick<RetrievedDocument, 'id' | 'url'>,
): RetrievedDocument {
  return {
    title: partial.title ?? 'Title',
    canonicalUrl: partial.canonicalUrl ?? partial.url,
    snippet: partial.snippet ?? '',
    domain: partial.domain ?? 'example.com',
    sourceType: partial.sourceType ?? 'web',
    isOfficial: partial.isOfficial ?? false,
    trustScore: partial.trustScore ?? 50,
    relevanceScore: partial.relevanceScore ?? 0.5,
    retrievedAt: partial.retrievedAt ?? new Date('2026-07-01T00:00:00Z'),
    publishedAt: partial.publishedAt,
    ...partial,
  };
}

describe('canonicalizeUrl', () => {
  it('strips tracking params and trailing slash', () => {
    const result = canonicalizeUrl('https://WWW.Example.com/path/?utm_source=x&id=1');
    expect(result).toBe('https://www.example.com/path?id=1');
  });
});

describe('dedupeDocuments', () => {
  it('keeps the stronger document for duplicate URLs', () => {
    const result = dedupeDocuments([
      doc({
        id: 'a',
        url: 'https://example.com/a?utm_source=tw',
        relevanceScore: 0.4,
        trustScore: 40,
      }),
      doc({
        id: 'b',
        url: 'https://example.com/a',
        relevanceScore: 0.9,
        trustScore: 90,
      }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('b');
  });
});

describe('rankDocuments', () => {
  it('ranks official high-trust docs above weak ones', () => {
    const ranked = rankDocuments(
      [
        doc({
          id: 'weak',
          url: 'https://blog.example/x',
          trustScore: 20,
          relevanceScore: 0.9,
          isOfficial: false,
        }),
        doc({
          id: 'official',
          url: 'https://gov.example/x',
          trustScore: 95,
          relevanceScore: 0.7,
          isOfficial: true,
          publishedAt: new Date('2026-07-10T00:00:00Z'),
        }),
      ],
      { now: new Date('2026-07-11T00:00:00Z') },
    );

    expect(ranked[0]?.id).toBe('official');
  });
});

describe('normalizeQuery', () => {
  it('collapses whitespace and lowercases', () => {
    expect(normalizeQuery('  Hello   World  ')).toBe('hello world');
  });
});

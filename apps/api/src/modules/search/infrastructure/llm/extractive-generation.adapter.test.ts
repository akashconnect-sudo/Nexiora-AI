import { describe, expect, it } from 'vitest';
import type { RankedDocument } from '@nexiora/search-core';
import { ExtractiveGenerationAdapter } from './extractive-generation.adapter';

function doc(partial: Partial<RankedDocument> & Pick<RankedDocument, 'id' | 'url'>): RankedDocument {
  return {
    title: 'Example',
    canonicalUrl: partial.url,
    snippet: 'Trusted snippet about the topic.',
    domain: 'example.gov',
    sourceType: 'government',
    isOfficial: true,
    trustScore: 95,
    relevanceScore: 0.9,
    finalScore: 0.9,
    retrievedAt: new Date(),
    ...partial,
  };
}

describe('ExtractiveGenerationAdapter', () => {
  it('grounds the answer in retrieved snippets', async () => {
    const adapter = new ExtractiveGenerationAdapter();
    const result = await adapter.generate({
      query: 'EU AI Act',
      intent: 'research',
      documents: [
        doc({
          id: '1',
          url: 'https://example.gov/ai-act',
          title: 'EU AI Act overview',
          snippet: 'The Act establishes risk tiers for AI systems.',
        }),
      ],
    });

    expect(result.summary).toContain('risk tiers');
    expect(result.detailedMarkdown).toContain('https://example.gov/ai-act');
    expect(result.model).toBe('nexiora-extractive-v1');
    expect(result.confidence).toBeGreaterThan(40);
  });

  it('abstains when no documents are available', async () => {
    const adapter = new ExtractiveGenerationAdapter();
    const result = await adapter.generate({
      query: 'obscure topic',
      intent: 'informational',
      documents: [],
    });
    expect(result.confidence).toBeLessThan(20);
    expect(result.summary.toLowerCase()).toContain('no matching sources');
  });
});

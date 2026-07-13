import { describe, expect, it } from 'vitest';
import { defaultSeo, homeCopy, pricingCopy, siteConfig } from './site';

const AI_SLOP = [
  'unlock your potential',
  'game-changer',
  'cutting-edge',
  'seamless experience',
  'leverage AI',
  'empower your',
  'revolutionary',
  'delve into',
];

function flattenCopy(): string {
  return JSON.stringify({
    defaultSeo,
    homeCopy,
    pricingCopy,
    siteConfig,
  }).toLowerCase();
}

describe('marketing copy quality', () => {
  it('includes core SEO terms', () => {
    const text = flattenCopy();
    expect(text).toContain('nova search');
    expect(text).toContain('citation');
    expect(text).toContain('nexiora');
    expect(defaultSeo.keywords.length).toBeGreaterThan(3);
  });

  it('avoids common AI marketing filler phrases', () => {
    const text = flattenCopy();
    for (const phrase of AI_SLOP) {
      expect(text.includes(phrase)).toBe(false);
    }
  });

  it('keeps homepage FAQ answers concrete', () => {
    expect(homeCopy.sections.faq.items.length).toBeGreaterThanOrEqual(3);
    for (const item of homeCopy.sections.faq.items) {
      expect(item.a.length).toBeGreaterThan(40);
      expect(item.q.endsWith('?')).toBe(true);
    }
  });
});

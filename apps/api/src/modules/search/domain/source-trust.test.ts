import { describe, expect, it } from 'vitest';
import { applySourceTrustBoost } from './source-trust';

describe('applySourceTrustBoost', () => {
  it('raises trust for known official domains', () => {
    const boosted = applySourceTrustBoost({
      domain: 'europa.eu',
      trustScore: 40,
      isOfficial: false,
    });
    expect(boosted.trustScore).toBeGreaterThanOrEqual(96);
    expect(boosted.isOfficial).toBe(true);
  });

  it('leaves unknown domains unchanged', () => {
    const doc = { domain: 'random-blog.example', trustScore: 55, isOfficial: false };
    expect(applySourceTrustBoost(doc)).toEqual(doc);
  });
});

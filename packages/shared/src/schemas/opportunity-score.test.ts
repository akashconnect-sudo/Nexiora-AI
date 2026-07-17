import { describe, expect, it } from 'vitest';
import { computeOpportunityScores, type OpportunityInputs } from './opportunity-score';

describe('computeOpportunityScores', () => {
  it('raises opportunity when demand is high and competition is low', () => {
    const lowComp: OpportunityInputs = {
      searchDemand: 80,
      competition: 20,
      growthSpeed: 70,
      evergreenScore: 50,
      monetizationScore: 60,
      cpmScore: 55,
      difficulty: 30,
      audienceInterest: 75,
      trendPrediction: 65,
      viralityScore: 60,
      verifiedInputRatio: 0.2,
    };
    const highComp = { ...lowComp, competition: 90, difficulty: 85 };
    const a = computeOpportunityScores(lowComp);
    const b = computeOpportunityScores(highComp);
    expect(a.opportunityScore).toBeGreaterThan(b.opportunityScore);
    expect(a.confidenceScore).toBeLessThan(70);
  });

  it('increases confidence with verified inputs', () => {
    const base: OpportunityInputs = {
      searchDemand: 50,
      competition: 50,
      growthSpeed: 50,
      evergreenScore: 50,
      monetizationScore: 50,
      cpmScore: 50,
      difficulty: 50,
      audienceInterest: 50,
      trendPrediction: 50,
      viralityScore: 50,
      verifiedInputRatio: 0,
    };
    const low = computeOpportunityScores(base);
    const high = computeOpportunityScores({ ...base, verifiedInputRatio: 1 });
    expect(high.confidenceScore).toBeGreaterThan(low.confidenceScore);
  });
});

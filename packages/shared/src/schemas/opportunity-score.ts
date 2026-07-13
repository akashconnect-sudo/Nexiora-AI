import type { OpportunityScores } from './creator';

export type OpportunityInputs = {
  searchDemand: number;
  competition: number;
  growthSpeed: number;
  evergreenScore: number;
  monetizationScore: number;
  cpmScore: number;
  difficulty: number;
  audienceInterest: number;
  trendPrediction: number;
  viralityScore: number;
  /** 0–1 share of inputs backed by consented verified APIs */
  verifiedInputRatio: number;
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Weighted Content Opportunity Score.
 * Competition and difficulty are inverted (lower is better for the creator).
 */
export function computeOpportunityScores(input: OpportunityInputs): OpportunityScores {
  const opportunity =
    input.searchDemand * 0.14 +
    (100 - input.competition) * 0.14 +
    input.growthSpeed * 0.12 +
    input.evergreenScore * 0.06 +
    input.monetizationScore * 0.08 +
    input.cpmScore * 0.08 +
    (100 - input.difficulty) * 0.1 +
    input.audienceInterest * 0.1 +
    input.trendPrediction * 0.1 +
    input.viralityScore * 0.08;

  const confidence = 28 + input.verifiedInputRatio * 55 + Math.min(17, input.growthSpeed * 0.12);

  return {
    searchDemand: clamp(input.searchDemand),
    competition: clamp(input.competition),
    growthSpeed: clamp(input.growthSpeed),
    evergreenScore: clamp(input.evergreenScore),
    monetizationScore: clamp(input.monetizationScore),
    cpmScore: clamp(input.cpmScore),
    difficulty: clamp(input.difficulty),
    audienceInterest: clamp(input.audienceInterest),
    trendPrediction: clamp(input.trendPrediction),
    viralityScore: clamp(input.viralityScore),
    opportunityScore: clamp(opportunity),
    confidenceScore: clamp(confidence),
  };
}

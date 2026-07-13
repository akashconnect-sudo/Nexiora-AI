import { describe, expect, it } from 'vitest';
import {
  buildRecommendations,
  generateIdeaPack,
  scoreTopicFromSignals,
  type CreatorProfileRecord,
} from './creator-intelligence';

const profile: CreatorProfileRecord = {
  userId: 'u1',
  displayName: 'Bobby',
  niche: 'AI News',
  language: 'en',
  country: 'US',
  speakingStyle: 'clear',
  preferredLengthMinutes: 12,
  permissions: {
    youtube_channel: false,
    google_account: false,
    google_trends: false,
    nexiora_search_history: true,
    saved_topics: true,
    bookmarks: true,
    notifications: true,
  },
  onboardingCompletedAt: new Date().toISOString(),
  youtubeChannelId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('creator-intelligence domain', () => {
  it('builds recommendations with why + disclaimer', () => {
    const recs = buildRecommendations({
      profile,
      signals: [
        {
          title: 'New ChatGPT Features announced',
          url: 'https://example.com/a',
          source: 'BBC Technology',
          category: 'technology',
          publishedAt: new Date().toISOString(),
        },
      ],
      limit: 4,
    });
    expect(recs.length).toBeGreaterThan(0);
    for (const r of recs) {
      expect(r.why.length).toBeGreaterThan(10);
      expect(r.disclaimer.toLowerCase()).toContain('estimate');
      expect(r.scores.opportunityScore).toBeGreaterThanOrEqual(0);
    }
  });

  it('idea pack includes multi-format assets', () => {
    const pack = generateIdeaPack('Cyber Security', 'AI News');
    expect(pack.videoTitles.length).toBeGreaterThanOrEqual(3);
    expect(pack.shortsIdeas.length).toBeGreaterThan(0);
    expect(pack.kind).toBe('prediction');
  });

  it('scores stay in range', () => {
    const scores = scoreTopicFromSignals('Windows AI', [], 'AI News', 0.2);
    expect(scores.opportunityScore).toBeGreaterThanOrEqual(0);
    expect(scores.opportunityScore).toBeLessThanOrEqual(100);
  });
});

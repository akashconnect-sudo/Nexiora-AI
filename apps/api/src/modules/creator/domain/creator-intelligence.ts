import {
  computeOpportunityScores,
  cleanDisplayText,
  type CreatorPermissionsMap,
  type OpportunityScores,
  type TopicRecommendation,
} from '@nexiora/shared';

export const DEFAULT_PERMISSIONS: CreatorPermissionsMap = {
  youtube_channel: false,
  google_account: false,
  google_trends: false,
  nexiora_search_history: false,
  saved_topics: false,
  bookmarks: false,
  notifications: false,
};

export const PREDICTION_DISCLAIMER =
  'These suggestions use public headlines and your niche. They are informed estimates — not guarantees.';

export type CreatorProfileRecord = {
  userId: string;
  displayName: string | null;
  niche: string | null;
  language: string;
  country: string | null;
  speakingStyle: string | null;
  preferredLengthMinutes: number | null;
  permissions: CreatorPermissionsMap;
  onboardingCompletedAt: string | null;
  youtubeChannelId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatorDnaRecord = {
  favoriteTopics: string[];
  uploadFrequency: string | null;
  videoLengthMinutes: number | null;
  language: string;
  country: string | null;
  audienceLocations: string[];
  audienceInterests: string[];
  speakingStyle: string | null;
  thumbnailStyle: string | null;
  titleStyle: string | null;
  seoStyle: string | null;
  bestPerformingTopics: string[];
  uploadTiming: string | null;
  avgViews: number | null;
  avgCtr: number | null;
  avgWatchTimeSec: number | null;
  avgRetention: number | null;
  successfulKeywords: string[];
  audienceQuestions: string[];
  contentCategories: string[];
  competitorOverlap: string[];
  metricsProvenance: 'inferred' | 'verified';
  updatedAt: string;
};

export type SignalItem = {
  title: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string;
};

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

function unit(n: number): number {
  return n % 100;
}

export function scoreTopicFromSignals(
  topic: string,
  signals: SignalItem[],
  niche: string | null,
  verifiedRatio: number,
): OpportunityScores {
  const related = signals.filter((s) =>
    `${s.title} ${s.category}`.toLowerCase().includes(topic.toLowerCase().split(' ')[0] ?? ''),
  );
  const nicheBoost =
    niche && topic.toLowerCase().includes(niche.toLowerCase().split(' ')[0] ?? '') ? 18 : 0;
  const demand = Math.min(95, 42 + related.length * 8 + nicheBoost + unit(hash(topic)) * 0.15);
  const competition = Math.max(12, 78 - related.length * 6 - nicheBoost * 0.5);
  const growth = Math.min(92, 35 + related.length * 10 + unit(hash(topic + 'g')) * 0.2);
  return computeOpportunityScores({
    searchDemand: demand,
    competition,
    growthSpeed: growth,
    evergreenScore: 40 + unit(hash(topic + 'e')) * 0.35,
    monetizationScore: 45 + nicheBoost + unit(hash(topic + 'm')) * 0.25,
    cpmScore: 40 + nicheBoost * 0.8 + unit(hash(topic + 'c')) * 0.3,
    difficulty: competition * 0.85,
    audienceInterest: Math.min(95, demand * 0.9 + nicheBoost),
    trendPrediction: growth,
    viralityScore: Math.min(90, growth * 0.85 + related.length * 3),
    verifiedInputRatio: verifiedRatio,
  });
}

export function buildRecommendations(input: {
  profile: CreatorProfileRecord;
  signals: SignalItem[];
  limit?: number;
}): TopicRecommendation[] {
  const niche = input.profile.niche?.trim() || 'technology';
  const seeds = uniqueTopics([
    niche,
    ...input.signals.slice(0, 12).map((s) => simplifyTitle(s.title)),
    `${niche} tutorial`,
    `${niche} news today`,
    `beginner ${niche}`,
    `${niche} vs alternatives`,
  ]).slice(0, input.limit ?? 8);

  const verifiedRatio = input.profile.permissions.youtube_channel ? 0.55 : 0.15;

  return seeds.map((topic, index) => {
    const matched = input.signals.find((s) =>
      s.title.toLowerCase().includes(topic.toLowerCase().split(' ')[0] ?? ''),
    );
    const scores = scoreTopicFromSignals(topic, input.signals, niche, verifiedRatio);
    const kind = matched ? ('signal' as const) : ('prediction' as const);
    return {
      id: `rec-${hash(topic).toString(36)}-${index}`,
      topic,
      why: matched
        ? `${matched.source} is covering related stories right now, and it overlaps your niche (${niche}).`
        : `Suggested from your niche (${niche}) and recent public headlines — confirm before you film.`,
      kind,
      scores,
      sources: matched
        ? [{ label: matched.source, url: matched.url }]
        : [{ label: 'Public headlines and topic patterns' }],
      bestUploadWindow: scores.growthSpeed > 65 ? 'Next 24–48 hours' : 'This week',
      disclaimer: PREDICTION_DISCLAIMER,
    };
  });
}

export function buildDna(profile: CreatorProfileRecord, signals: SignalItem[]): CreatorDnaRecord {
  const niche = profile.niche || 'general';
  const topics = uniqueTopics([
    niche,
    ...signals.slice(0, 8).map((s) => simplifyTitle(s.title)),
  ]).slice(0, 8);

  return {
    favoriteTopics: topics,
    uploadFrequency: profile.permissions.youtube_channel ? null : 'Add your channel to unlock this',
    videoLengthMinutes: profile.preferredLengthMinutes,
    language: profile.language,
    country: profile.country,
    audienceLocations: profile.country ? [profile.country] : [],
    audienceInterests: topics.slice(0, 5),
    speakingStyle: profile.speakingStyle,
    thumbnailStyle: 'Available after you connect your channel',
    titleStyle: 'Available after you connect your channel',
    seoStyle: 'Available after you connect your channel',
    bestPerformingTopics: [],
    uploadTiming: null,
    avgViews: null,
    avgCtr: null,
    avgWatchTimeSec: null,
    avgRetention: null,
    successfulKeywords: topics.slice(0, 6),
    audienceQuestions: topics.map((t) => `What is ${t}?`),
    contentCategories: [niche],
    competitorOverlap: [],
    metricsProvenance: profile.permissions.youtube_channel ? 'verified' : 'inferred',
    updatedAt: new Date().toISOString(),
  };
}

export function generateIdeaPack(topic: string, niche: string | null) {
  const label = niche ? `${topic} (${niche})` : topic;
  return {
    topic,
    kind: 'prediction' as const,
    disclaimer: PREDICTION_DISCLAIMER,
    why: `Created for “${label}” using common patterns that work well for educational channels.`,
    videoTitles: [
      `${topic}: What Actually Matters in 2026`,
      `I Tested ${topic} So You Don't Have To`,
      `${topic} Explained in 12 Minutes`,
      `Stop Making This ${topic} Mistake`,
      `${topic} Roadmap for Beginners`,
    ],
    thumbnailIdeas: [
      'High-contrast face + 3-word outcome text',
      'Before/after split with red X vs green check',
      'Single object close-up + bold question',
    ],
    hooks: [
      `If you're still ignoring ${topic}, you're leaving views on the table.`,
      `Most creators talk about ${topic} — almost nobody shows the workflow.`,
      `In the next 60 seconds I'll show the only ${topic} setup that matters.`,
    ],
    scriptOutline: [
      'Hook (0–15s)',
      'Promise + stakes',
      '3 actionable beats with proof',
      'Mistake to avoid',
      'CTA + next video bridge',
    ],
    seoKeywords: [
      topic.toLowerCase(),
      `${topic.toLowerCase()} tutorial`,
      `${topic.toLowerCase()} explained`,
      `best ${topic.toLowerCase()}`,
      `${topic.toLowerCase()} 2026`,
    ],
    description: `In this video we break down ${topic} with practical steps, common mistakes, and sources you can verify.`,
    tags: [topic, 'tutorial', 'explained', '2026', niche || 'education'].filter(Boolean),
    hashtags: [`#${topic.replace(/\s+/g, '')}`, '#YouTubeGrowth', '#CreatorTips'],
    shortsIdeas: [`${topic} in 45 seconds`, `One tip for ${topic}`, `Myth vs fact: ${topic}`],
    longformIdeas: [`Complete ${topic} guide`, `${topic} case study`],
    podcastIdeas: [`Deep dive: ${topic}`, `AMA on ${topic}`],
    communityPosts: [`Which ${topic} angle should I cover next?`],
    tweets: [`Creators: ${topic} is heating up — here's the angle I'd film first.`],
    linkedInPosts: [`Creator note: ${topic} is showing rising public signal interest.`],
    instagramReels: [`3 cuts: problem → demo → result for ${topic}`],
    facebookPosts: [`New video idea: ${topic} — what do you want covered?`],
    blogArticles: [`${topic}: a research-backed primer for creators`],
    newsletterIdeas: [`This week in ${topic}: 3 angles before saturation`],
  };
}

export function enrichSearch(query: string, niche: string | null, signals: SignalItem[]) {
  const scores = scoreTopicFromSignals(query, signals, niche, 0.2);
  return {
    query,
    kind: 'prediction' as const,
    disclaimer: PREDICTION_DISCLAIMER,
    opportunityScore: scores.opportunityScore,
    confidenceScore: scores.confidenceScore,
    scores,
    betterTopics: [
      `${query} for beginners`,
      `${query} mistakes`,
      `${query} vs alternatives`,
      `${query} workflow`,
      `${query} case study`,
    ],
    relatedTopics: Array.from({ length: 10 }, (_, i) => `${query} angle ${i + 1}`).map((t, i) =>
      i < 4 ? `${simplifyTitle(signals[i]?.title || query)}` : t,
    ),
    lowCompetitionKeywords: [`${query} checklist`, `${query} template`, `${query} examples`],
    highSearchVolumeKeywords: [query, `${query} tutorial`, `${query} explained`],
    trendingQuestions: [
      `What is ${query}?`,
      `Is ${query} worth it?`,
      `How to start with ${query}?`,
    ],
    peopleAlsoAsk: [
      `How does ${query} work?`,
      `Best tools for ${query}?`,
      `Common ${query} mistakes?`,
    ],
    suggestedVideoTitles: [
      `${query}: The Honest Breakdown`,
      `I Fixed My ${query} Strategy in 7 Days`,
    ],
    thumbnailConcepts: ['Curious face + bold keyword', 'Diagram + result number'],
    scriptOutline: ['Hook', 'Context', 'Steps', 'Proof', 'CTA'],
    estimatedAudience: niche ? `${niche} learners + adjacent curiosity traffic` : 'General curiosity + niche learners',
    estimatedCompetition: scores.competition > 60 ? 'High' : scores.competition > 35 ? 'Medium' : 'Low',
    why: `Suggestions blend your search with related headlines and opportunity estimates.`,
  };
}

export function coachTips(profile: CreatorProfileRecord, top: TopicRecommendation[]) {
  const connected = profile.permissions.youtube_channel;
  return [
    {
      id: 'coach-connect',
      title: connected ? 'Keep your profile current' : 'Connect YouTube for channel insights',
      body: connected
        ? 'Refresh weekly so performance tips stay based on your latest uploads.'
        : 'Without your channel we use public headlines and your niche. Connect YouTube when you are ready.',
      kind: connected ? ('verified' as const) : ('prediction' as const),
      why: 'Better tips come from the data you choose to share.',
    },
    {
      id: 'coach-next',
      title: top[0] ? `Film next: ${top[0].topic}` : 'Set a clear niche',
      body: top[0]
        ? `${top[0].why} Opportunity score ${top[0].scores.opportunityScore}/100.`
        : 'Add your niche in setup so daily recommendations get sharper.',
      kind: top[0]?.kind ?? ('prediction' as const),
      why: 'Focus on one strong opportunity before the topic gets crowded.',
    },
    {
      id: 'coach-avoid',
      title: 'Skip generic list videos',
      body: 'Avoid broad “Top 10 tools” videos unless you bring a unique proof angle — competition is usually high.',
      kind: 'prediction' as const,
      why: 'Crowded formats often underperform for growing channels.',
    },
    {
      id: 'coach-titles',
      title: 'Titles that tend to work',
      body: 'Clear outcome + specific detail + year usually beats vague curiosity gaps for educational niches.',
      kind: 'prediction' as const,
      why: 'Common pattern for educational YouTube — test it on your channel.',
    },
  ];
}

function simplifyTitle(title: string): string {
  return cleanDisplayText(title)
    .replace(/[|:–—].*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

function uniqueTopics(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const t = item.replace(/\s+/g, ' ').trim();
    if (!t || t.length < 3) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

import { z } from 'zod';

/** Explicit creator data scopes — never implied. */
export const CreatorPermissionSchema = z.enum([
  'youtube_channel',
  'google_account',
  'google_trends',
  'nexiora_search_history',
  'saved_topics',
  'bookmarks',
  'notifications',
]);

export type CreatorPermission = z.infer<typeof CreatorPermissionSchema>;

export const EvidenceKindSchema = z.enum(['prediction', 'signal', 'verified']);
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;

export const CreatorPermissionsMapSchema = z.object({
  youtube_channel: z.boolean().default(false),
  google_account: z.boolean().default(false),
  google_trends: z.boolean().default(false),
  nexiora_search_history: z.boolean().default(false),
  saved_topics: z.boolean().default(false),
  bookmarks: z.boolean().default(false),
  notifications: z.boolean().default(false),
});

export type CreatorPermissionsMap = z.infer<typeof CreatorPermissionsMapSchema>;

export const OpportunityScoresSchema = z.object({
  searchDemand: z.number().min(0).max(100),
  competition: z.number().min(0).max(100),
  growthSpeed: z.number().min(0).max(100),
  evergreenScore: z.number().min(0).max(100),
  monetizationScore: z.number().min(0).max(100),
  cpmScore: z.number().min(0).max(100),
  difficulty: z.number().min(0).max(100),
  audienceInterest: z.number().min(0).max(100),
  trendPrediction: z.number().min(0).max(100),
  viralityScore: z.number().min(0).max(100),
  opportunityScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
});

export type OpportunityScores = z.infer<typeof OpportunityScoresSchema>;

export const TopicRecommendationSchema = z.object({
  id: z.string(),
  topic: z.string(),
  why: z.string(),
  kind: EvidenceKindSchema,
  scores: OpportunityScoresSchema,
  sources: z.array(
    z.object({
      label: z.string(),
      url: z.string().url().optional(),
    }),
  ),
  bestUploadWindow: z.string().optional(),
  disclaimer: z.string(),
});

export type TopicRecommendation = z.infer<typeof TopicRecommendationSchema>;

export const UpsertCreatorProfileSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  niche: z.string().min(1).max(200).optional(),
  language: z.string().min(2).max(16).optional(),
  country: z.string().min(2).max(8).optional(),
  speakingStyle: z.string().max(200).optional(),
  preferredLengthMinutes: z.number().int().min(1).max(180).optional(),
});

export const PatchCreatorPermissionsSchema = z.object({
  permissions: CreatorPermissionsMapSchema.partial(),
});

export const GenerateIdeasRequestSchema = z.object({
  topic: z.string().min(2).max(300),
  format: z.enum(['longform', 'shorts', 'podcast', 'community', 'multi']).default('multi'),
});

export const EnrichCreatorSearchSchema = z.object({
  query: z.string().min(1).max(500),
});

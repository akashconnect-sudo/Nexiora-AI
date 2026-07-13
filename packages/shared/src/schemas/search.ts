import { z } from 'zod';

/** Supported Nova Search modes (SRS FR-SEARCH-16). */
export const SearchModeSchema = z.enum([
  'universal',
  'research',
  'news',
  'code',
  'academic',
  'creator',
  'shopping',
  'travel',
  'jobs',
  'maps',
  'people',
  'companies',
  'healthcare',
  'finance',
]);

export type SearchMode = z.infer<typeof SearchModeSchema>;

export const SourceTypeSchema = z.enum([
  'web',
  'news',
  'academic',
  'government',
  'docs',
  'github',
  'youtube',
  'blog',
  'social',
  'reddit',
  'hn',
  'pdf',
  'image',
  'video',
  'other',
]);

export type SourceType = z.infer<typeof SourceTypeSchema>;

export const SearchQualityFilterSchema = z.enum([
  'most_accurate',
  'most_recent',
  'verified',
  'ai_generated',
  'official_only',
]);

export const SearchFiltersSchema = z.object({
  country: z.string().length(2).or(z.literal('EU')).optional(),
  language: z.string().min(2).max(16).optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
  sources: z.array(SourceTypeSchema).optional(),
  fileTypes: z.array(z.enum(['pdf', 'doc', 'ppt', 'excel', 'csv', 'images', 'videos'])).optional(),
  quality: z.array(SearchQualityFilterSchema).optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export const CreateSearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  mode: SearchModeSchema.default('universal'),
  filters: SearchFiltersSchema.default({}),
  options: z
    .object({
      creatorMode: z.boolean().default(false),
      private: z.boolean().default(false),
      stream: z.boolean().default(true),
    })
    .default({}),
  workspaceId: z.string().uuid().nullable().optional(),
});

export type CreateSearchRequest = z.infer<typeof CreateSearchRequestSchema>;

export const SearchStatusSchema = z.enum([
  'pending',
  'retrieving',
  'generating',
  'completed',
  'failed',
  'partial',
]);

export type SearchStatus = z.infer<typeof SearchStatusSchema>;

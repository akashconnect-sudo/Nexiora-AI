import { z } from 'zod';

/**
 * Versioned BullMQ job payloads.
 * Prefer IDs over content so Redis never holds queries, answers, or secrets.
 */

export const SearchExecuteJobSchema = z.object({
  version: z.literal(1),
  searchId: z.string().uuid(),
  requestedAt: z.string().datetime(),
  traceparent: z.string().optional(),
  tracestate: z.string().optional(),
});
export type SearchExecuteJob = z.infer<typeof SearchExecuteJobSchema>;

export const SourceIndexJobSchema = z.object({
  version: z.literal(1),
  sourceDocumentId: z.string().uuid(),
  contentHash: z.string().min(8),
  traceparent: z.string().optional(),
  tracestate: z.string().optional(),
});
export type SourceIndexJob = z.infer<typeof SourceIndexJobSchema>;

export const DocumentEmbedJobSchema = z.object({
  version: z.literal(1),
  sourceDocumentId: z.string().uuid(),
  contentHash: z.string().min(8),
  model: z.string().min(1),
  traceparent: z.string().optional(),
  tracestate: z.string().optional(),
});
export type DocumentEmbedJob = z.infer<typeof DocumentEmbedJobSchema>;

export const NewsRefreshJobSchema = z.object({
  version: z.literal(1),
  feedId: z.string().optional(),
  scheduledFor: z.string().datetime(),
});
export type NewsRefreshJob = z.infer<typeof NewsRefreshJobSchema>;

export const DataCleanupJobSchema = z.object({
  version: z.literal(1),
  cutoffIso: z.string().datetime(),
  dryRun: z.boolean().default(false),
});
export type DataCleanupJob = z.infer<typeof DataCleanupJobSchema>;

export const IndexReconcileJobSchema = z.object({
  version: z.literal(1),
  limit: z.number().int().positive().max(500).default(50),
});
export type IndexReconcileJob = z.infer<typeof IndexReconcileJobSchema>;

export const OutboxDispatchJobSchema = z.object({
  version: z.literal(1),
  batchSize: z.number().int().positive().max(200).default(50),
});
export type OutboxDispatchJob = z.infer<typeof OutboxDispatchJobSchema>;

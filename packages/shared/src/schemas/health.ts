import { z } from 'zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  service: z.string(),
  version: z.string(),
  timestamp: z.string().datetime({ offset: true }),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ReadyResponseSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  checks: z.record(z.boolean()),
  /** Optional backends that must never block readiness (indexes, etc.). */
  diagnostics: z.record(z.boolean()).optional(),
  timestamp: z.string().datetime({ offset: true }),
});

export type ReadyResponse = z.infer<typeof ReadyResponseSchema>;

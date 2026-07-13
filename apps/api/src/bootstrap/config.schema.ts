import { z } from 'zod';

/**
 * Validates process.env at boot. Fail fast on misconfiguration.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  OPENSEARCH_NODE: z.string().url().default('http://localhost:9200'),
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  PUBLIC_WEB_URL: z.string().url().default('http://localhost:3000'),
  CLERK_SECRET_KEY: z.string().optional().default(''),
  CLERK_PUBLISHABLE_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_PRICE_PRO: z.string().optional().default(''),
  STRIPE_PRICE_BUSINESS: z.string().optional().default(''),
  OTEL_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  OTEL_SERVICE_NAME: z.string().default('nexiora-api'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  IP_HASH_SECRET: z.string().min(16).default('dev-only-change-me-32chars!!'),
  AUTH_JWT_SECRET: z.string().min(16).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return parsed.data;
}

import { z } from 'zod';

/**
 * Validates process.env at boot. Fail fast on misconfiguration.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  OPENSEARCH_NODE: z.string().url().default('http://localhost:9200'),
  OPENSEARCH_USERNAME: z.string().optional().default(''),
  OPENSEARCH_PASSWORD: z.string().optional().default(''),
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().optional().default(''),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
  PUBLIC_WEB_URL: z.string().url().default('http://localhost:3000'),
  CLERK_SECRET_KEY: z.string().optional().default(''),
  CLERK_PUBLISHABLE_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_EMBEDDING_DIMS: z.coerce.number().int().positive().default(1536),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().optional().default('Nexiora AI <onboarding@resend.dev>'),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  OTEL_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  OTEL_SERVICE_NAME: z.string().default('nexiora-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional().default(''),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional().default(''),
  OTEL_SERVICE_VERSION: z.string().optional().default('0.1.0'),
  OTEL_DEPLOYMENT_ENVIRONMENT: z.string().optional().default('development'),
  OTEL_TRACES_SAMPLER: z.string().optional().default('parentbased_traceidratio'),
  OTEL_TRACES_SAMPLER_ARG: z.coerce.number().min(0).max(1).default(0.2),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  IP_HASH_SECRET: z.string().min(16).default('dev-only-change-me-32chars!!'),
  AUTH_JWT_SECRET: z.string().min(16).optional(),
  SEARCH_EXECUTION_MODE: z.enum(['inline', 'queue']).default('inline'),
  SEARCH_INDEX_READ_MODE: z.enum(['off', 'shadow', 'on']).default('off'),
  SEARCH_INDEX_WRITE_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SEARCH_INDEX_ALIAS: z.string().default('documents_read'),
  SEARCH_INDEX_WRITE_ALIAS: z.string().default('documents_write'),
  QDRANT_COLLECTION: z.string().default('doc_embeddings_v1'),
  QUEUE_PREFIX_ENV: z.string().optional().default(''),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  INDEX_RETRIEVAL_TIMEOUT_MS: z.coerce.number().int().positive().default(1800),
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

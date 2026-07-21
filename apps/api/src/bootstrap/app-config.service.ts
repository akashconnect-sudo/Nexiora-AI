import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from './config.schema';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  get nodeEnv(): AppEnv['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get redisUrl(): string {
    return this.config.get('REDIS_URL', { infer: true });
  }

  get apiPort(): number {
    return this.config.get('API_PORT', { infer: true });
  }

  get apiHost(): string {
    return this.config.get('API_HOST', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get clerkSecretKey(): string {
    return this.config.get('CLERK_SECRET_KEY', { infer: true });
  }

  get clerkConfigured(): boolean {
    return Boolean(this.clerkSecretKey);
  }

  get ipHashSecret(): string {
    return this.config.get('IP_HASH_SECRET', { infer: true });
  }

  get opensearchNode(): string {
    return this.config.get('OPENSEARCH_NODE', { infer: true });
  }

  get qdrantUrl(): string {
    return this.config.get('QDRANT_URL', { infer: true });
  }

  get qdrantApiKey(): string {
    return this.config.get('QDRANT_API_KEY', { infer: true })?.trim() ?? '';
  }

  get opensearchUsername(): string {
    return this.config.get('OPENSEARCH_USERNAME', { infer: true })?.trim() ?? '';
  }

  get opensearchPassword(): string {
    return this.config.get('OPENSEARCH_PASSWORD', { infer: true })?.trim() ?? '';
  }

  get openaiEmbeddingModel(): string {
    return this.config.get('OPENAI_EMBEDDING_MODEL', { infer: true });
  }

  get openaiEmbeddingDims(): number {
    return this.config.get('OPENAI_EMBEDDING_DIMS', { infer: true });
  }

  get searchExecutionMode(): 'inline' | 'queue' {
    return this.config.get('SEARCH_EXECUTION_MODE', { infer: true });
  }

  get searchIndexReadMode(): 'off' | 'shadow' | 'on' {
    return this.config.get('SEARCH_INDEX_READ_MODE', { infer: true });
  }

  get searchIndexWriteEnabled(): boolean {
    return this.config.get('SEARCH_INDEX_WRITE_ENABLED', { infer: true });
  }

  get searchIndexAlias(): string {
    return this.config.get('SEARCH_INDEX_ALIAS', { infer: true });
  }

  get searchIndexWriteAlias(): string {
    return this.config.get('SEARCH_INDEX_WRITE_ALIAS', { infer: true });
  }

  get qdrantCollection(): string {
    return this.config.get('QDRANT_COLLECTION', { infer: true });
  }

  get queuePrefixEnv(): string {
    return (
      this.config.get('QUEUE_PREFIX_ENV', { infer: true })?.trim() ||
      this.config.get('OTEL_DEPLOYMENT_ENVIRONMENT', { infer: true }) ||
      this.nodeEnv
    );
  }

  get workerConcurrency(): number {
    return this.config.get('WORKER_CONCURRENCY', { infer: true });
  }

  get indexRetrievalTimeoutMs(): number {
    return this.config.get('INDEX_RETRIEVAL_TIMEOUT_MS', { infer: true });
  }

  get otelEnabled(): boolean {
    return this.config.get('OTEL_ENABLED', { infer: true });
  }

  get otelServiceName(): string {
    return this.config.get('OTEL_SERVICE_NAME', { infer: true });
  }

  get otelExporterEndpoint(): string {
    return this.config.get('OTEL_EXPORTER_OTLP_ENDPOINT', { infer: true })?.trim() ?? '';
  }

  get openaiApiKey(): string {
    const key = this.config.get('OPENAI_API_KEY', { infer: true })?.trim() ?? '';
    if (
      !key ||
      /^(your-|sk-xxx|changeme|placeholder|replace)/i.test(key) ||
      key === 'sk-' ||
      key.length < 20
    ) {
      return '';
    }
    return key;
  }

  get openaiModel(): string {
    return this.config.get('OPENAI_MODEL', { infer: true });
  }

  get razorpayKeyId(): string {
    return (
      this.config.get('RAZORPAY_KEY_ID', { infer: true }).trim() ||
      this.config.get('NEXT_PUBLIC_RAZORPAY_KEY_ID', { infer: true }).trim()
    );
  }

  get razorpayKeySecret(): string {
    return this.config.get('RAZORPAY_KEY_SECRET', { infer: true }).trim();
  }

  get razorpayWebhookSecret(): string {
    return this.config.get('RAZORPAY_WEBHOOK_SECRET', { infer: true }).trim();
  }

  get publicWebUrl(): string {
    return this.config.get('PUBLIC_WEB_URL', { infer: true });
  }

  get authJwtSecret(): string {
    return this.config.get('AUTH_JWT_SECRET', { infer: true }) || this.ipHashSecret;
  }

  get resendApiKey(): string {
    return this.config.get('RESEND_API_KEY', { infer: true })?.trim() ?? '';
  }

  get emailFrom(): string {
    return this.config.get('EMAIL_FROM', { infer: true })?.trim() ?? '';
  }

  get smtpHost(): string {
    return this.config.get('SMTP_HOST', { infer: true })?.trim() ?? '';
  }

  get smtpPort(): number {
    return this.config.get('SMTP_PORT', { infer: true });
  }

  get smtpSecure(): boolean {
    return this.config.get('SMTP_SECURE', { infer: true });
  }

  get smtpUser(): string {
    return this.config.get('SMTP_USER', { infer: true })?.trim() ?? '';
  }

  get smtpPass(): string {
    return this.config.get('SMTP_PASS', { infer: true })?.trim() ?? '';
  }

  get smtpConfigured(): boolean {
    return Boolean(this.smtpHost && this.smtpUser && this.smtpPass);
  }
}

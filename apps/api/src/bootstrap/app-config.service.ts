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

  get stripeSecretKey(): string {
    return this.config.get('STRIPE_SECRET_KEY', { infer: true });
  }

  get stripeWebhookSecret(): string {
    return this.config.get('STRIPE_WEBHOOK_SECRET', { infer: true });
  }

  get stripePriceFree(): string {
    return this.config.get('STRIPE_PRICE_FREE', { infer: true });
  }

  get stripePricePro(): string {
    return this.config.get('STRIPE_PRICE_PRO', { infer: true });
  }

  get stripePriceBusiness(): string {
    return this.config.get('STRIPE_PRICE_BUSINESS', { infer: true });
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

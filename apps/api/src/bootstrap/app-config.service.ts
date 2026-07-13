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
    return this.config.get('OPENAI_API_KEY', { infer: true });
  }

  get openaiModel(): string {
    return this.config.get('OPENAI_MODEL', { infer: true });
  }

  get stripeSecretKey(): string {
    return this.config.get('STRIPE_SECRET_KEY', { infer: true });
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
}

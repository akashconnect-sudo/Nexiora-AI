export interface RateLimitResult {
  readonly allowed: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly resetAt: Date;
}

/**
 * Port for sliding/fixed window rate limiting.
 */
export interface RateLimiterPort {
  consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
}

export const RATE_LIMITER_PORT = Symbol('RATE_LIMITER_PORT');

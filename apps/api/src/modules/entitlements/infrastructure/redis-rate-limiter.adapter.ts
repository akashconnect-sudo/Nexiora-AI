import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import type { RateLimiterPort, RateLimitResult } from '../application/ports/rate-limiter.port';

/**
 * Redis fixed-window counter. Falls back to process memory when Redis is down.
 */
@Injectable()
export class RedisRateLimiterAdapter implements RateLimiterPort {
  private readonly logger = new Logger(RedisRateLimiterAdapter.name);
  private readonly memory = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly redis: RedisService) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const redisKey = `rl:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
    try {
      const healthy = await this.redis.isHealthy();
      if (healthy) {
        const count = await this.redis.raw.incr(redisKey);
        if (count === 1) {
          await this.redis.raw.expire(redisKey, windowSeconds);
        }
        const ttl = await this.redis.raw.ttl(redisKey);
        const resetAt = new Date(Date.now() + Math.max(ttl, 1) * 1000);
        return {
          allowed: count <= limit,
          limit,
          remaining: Math.max(0, limit - count),
          resetAt,
        };
      }
    } catch (error) {
      this.logger.warn(`Redis rate limit failed; using memory: ${(error as Error).message}`);
    }

    return this.consumeMemory(redisKey, limit, windowSeconds);
  }

  private consumeMemory(key: string, limit: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    const existing = this.memory.get(key);
    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowSeconds * 1000;
      this.memory.set(key, { count: 1, resetAt });
      return { allowed: true, limit, remaining: limit - 1, resetAt: new Date(resetAt) };
    }

    existing.count += 1;
    return {
      allowed: existing.count <= limit,
      limit,
      remaining: Math.max(0, limit - existing.count),
      resetAt: new Date(existing.resetAt),
    };
  }
}

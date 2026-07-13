import { Inject, Injectable } from '@nestjs/common';
import { ERROR_CODES, type PlanId } from '@nexiora/shared';
import { DomainError } from '../../../common/errors/domain-error';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  entitlementsForPlan,
  hashIp,
  resolveAnonymousEntitlements,
  type EntitlementContext,
} from '../domain/entitlements';
import {
  RATE_LIMITER_PORT,
  type RateLimiterPort,
} from './ports/rate-limiter.port';
import { AppConfigService } from '../../../bootstrap/app-config.service';

@Injectable()
export class EntitlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Inject(RATE_LIMITER_PORT) private readonly rateLimiter: RateLimiterPort,
  ) {}

  async resolveContext(userId: string | null, ip: string): Promise<EntitlementContext> {
    if (!userId) {
      const anon = resolveAnonymousEntitlements();
      return {
        userId: null,
        planId: anon.planId,
        entitlements: anon.entitlements,
        rateLimitKey: `ip:${hashIp(ip, this.config.ipHashSecret)}`,
      };
    }

    const planId = await this.resolvePlanId(userId);
    return {
      userId,
      planId,
      entitlements: entitlementsForPlan(planId),
      rateLimitKey: `user:${userId}`,
    };
  }

  /**
   * Enforce per-minute burst + daily search quota.
   */
  async assertSearchAllowed(ctx: EntitlementContext): Promise<void> {
    const burst = await this.rateLimiter.consume(`${ctx.rateLimitKey}:burst`, 10, 60);
    if (!burst.allowed) {
      throw new DomainError(
        ERROR_CODES.RATE_LIMITED,
        'Too many searches. Please wait a minute.',
        429,
        {
          limit: burst.limit,
          remaining: burst.remaining,
          resetAt: burst.resetAt.toISOString(),
        },
      );
    }

    const daily = await this.rateLimiter.consume(
      `${ctx.rateLimitKey}:day`,
      ctx.entitlements.dailySearchLimit,
      86_400,
    );
    if (!daily.allowed) {
      throw new DomainError(
        ERROR_CODES.QUOTA_EXCEEDED,
        `Daily search quota exceeded for plan ${ctx.planId}`,
        429,
        {
          planId: ctx.planId,
          limit: daily.limit,
          remaining: daily.remaining,
          resetAt: daily.resetAt.toISOString(),
        },
      );
    }
  }

  private async resolvePlanId(userId: string): Promise<PlanId> {
    try {
      const healthy = await this.prisma.isHealthy();
      if (!healthy) {
        return 'free';
      }
      const sub = await this.prisma.subscription.findUnique({ where: { userId } });
      if (sub?.status === 'active' || sub?.status === 'trialing') {
        if (sub.planId === 'pro' || sub.planId === 'business' || sub.planId === 'enterprise') {
          return sub.planId;
        }
      }
    } catch {
      return 'free';
    }
    return 'free';
  }
}

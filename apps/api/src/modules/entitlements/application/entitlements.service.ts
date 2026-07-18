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
import { RATE_LIMITER_PORT, type RateLimiterPort } from './ports/rate-limiter.port';
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
   * Enforce paid access, per-minute burst, Free lifetime allowance, and paid daily quotas.
   */
  async assertSearchAllowed(
    ctx: EntitlementContext,
  ): Promise<{ limitType: 'lifetime' | 'daily'; remaining: number }> {
    if (ctx.userId) {
      await this.assertPaidAccess(ctx.userId);
    } else {
      throw new DomainError(
        ERROR_CODES.PAYMENT_REQUIRED,
        'Sign in and complete the $2 Free activation payment to start searching.',
        402,
        { paymentRequired: true, activationFeeInr: 2, suggestedPlans: ['free', 'pro', 'business'] },
      );
    }

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

    if (ctx.planId === 'free') {
      const used = await this.countFreeSearches(ctx);
      if (used >= ctx.entitlements.dailySearchLimit) {
        throw new DomainError(
          ERROR_CODES.QUOTA_EXCEEDED,
          'Your free searches have been used. Upgrade to keep searching.',
          429,
          {
            planId: ctx.planId,
            limit: ctx.entitlements.dailySearchLimit,
            remaining: 0,
            upgradeRequired: true,
            suggestedPlans: ['pro', 'business'],
          },
        );
      }
      return {
        limitType: 'lifetime' as const,
        remaining: Math.max(0, ctx.entitlements.dailySearchLimit - used - 1),
      };
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
    return { limitType: 'daily' as const, remaining: daily.remaining };
  }

  private async assertPaidAccess(userId: string): Promise<void> {
    try {
      if (!(await this.prisma.isHealthy())) {
        throw new DomainError(
          ERROR_CODES.PAYMENT_REQUIRED,
          'Complete the $2 Free activation payment to use Nova Search.',
          402,
          {
            paymentRequired: true,
            activationFeeInr: 2,
            suggestedPlans: ['free', 'pro', 'business'],
          },
        );
      }
      const sub = await this.prisma.subscription.findUnique({ where: { userId } });
      if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
        return;
      }
    } catch (error) {
      if (error instanceof DomainError) throw error;
    }

    throw new DomainError(
      ERROR_CODES.PAYMENT_REQUIRED,
      'Complete the $2 Free activation payment to use Nova Search.',
      402,
      { paymentRequired: true, activationFeeInr: 2, suggestedPlans: ['free', 'pro', 'business'] },
    );
  }

  private async countFreeSearches(ctx: EntitlementContext): Promise<number> {
    try {
      if (await this.prisma.isHealthy()) {
        if (ctx.userId) {
          return this.prisma.searchSession.count({
            where: { userId: ctx.userId, deletedAt: null },
          });
        }

        const ipHash = ctx.rateLimitKey.replace(/^ip:/, '');
        return this.prisma.searchSession.count({
          where: { userId: null, ipHash, deletedAt: null },
        });
      }
    } catch {
      // Redis provides the fallback when PostgreSQL is unavailable.
    }

    const lifetime = await this.rateLimiter.consume(
      `${ctx.rateLimitKey}:free-lifetime`,
      ctx.entitlements.dailySearchLimit,
      10 * 365 * 24 * 60 * 60,
    );
    return lifetime.allowed
      ? ctx.entitlements.dailySearchLimit - lifetime.remaining - 1
      : ctx.entitlements.dailySearchLimit;
  }

  private async resolvePlanId(userId: string): Promise<PlanId> {
    try {
      const healthy = await this.prisma.isHealthy();
      if (!healthy) {
        return 'free';
      }
      const sub = await this.prisma.subscription.findUnique({ where: { userId } });
      if (sub?.status === 'active' || sub?.status === 'trialing') {
        if (
          sub.planId === 'free' ||
          sub.planId === 'pro' ||
          sub.planId === 'business' ||
          sub.planId === 'enterprise'
        ) {
          return sub.planId;
        }
      }
    } catch {
      return 'free';
    }
    return 'free';
  }
}

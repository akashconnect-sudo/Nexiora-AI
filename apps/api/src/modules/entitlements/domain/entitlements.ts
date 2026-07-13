import { createHash } from 'node:crypto';
import { DEFAULT_PLAN_ENTITLEMENTS, type PlanEntitlements, type PlanId } from '@nexiora/shared';

export interface EntitlementContext {
  readonly userId: string | null;
  readonly planId: PlanId;
  readonly entitlements: PlanEntitlements;
  /** Subject key for rate limits (user id or hashed IP). */
  readonly rateLimitKey: string;
}

export function hashIp(ip: string, secret: string): string {
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex').slice(0, 32);
}

export function resolveAnonymousEntitlements(): Pick<
  EntitlementContext,
  'planId' | 'entitlements'
> {
  return {
    planId: 'free',
    entitlements: {
      ...DEFAULT_PLAN_ENTITLEMENTS.free,
      // Anonymous visitors get a tighter daily cap than signed-in free users.
      dailySearchLimit: 5,
    },
  };
}

export function entitlementsForPlan(planId: PlanId): PlanEntitlements {
  return DEFAULT_PLAN_ENTITLEMENTS[planId];
}

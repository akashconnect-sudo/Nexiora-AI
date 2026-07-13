/**
 * Subscription plan identifiers and default entitlements.
 * Billing module may override per-environment via Plan table.
 */
export const PLAN_IDS = ['free', 'pro', 'business', 'enterprise'] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanEntitlements {
  readonly dailySearchLimit: number;
  readonly apiEnabled: boolean;
  readonly creatorMode: boolean;
  readonly researchMode: boolean;
  readonly workspaces: boolean;
}

export const DEFAULT_PLAN_ENTITLEMENTS: Record<PlanId, PlanEntitlements> = {
  free: {
    dailySearchLimit: 20,
    apiEnabled: false,
    creatorMode: false,
    researchMode: false,
    workspaces: false,
  },
  pro: {
    dailySearchLimit: 500,
    apiEnabled: true,
    creatorMode: true,
    researchMode: true,
    workspaces: false,
  },
  business: {
    dailySearchLimit: 5000,
    apiEnabled: true,
    creatorMode: true,
    researchMode: true,
    workspaces: true,
  },
  enterprise: {
    dailySearchLimit: 100_000,
    apiEnabled: true,
    creatorMode: true,
    researchMode: true,
    workspaces: true,
  },
};

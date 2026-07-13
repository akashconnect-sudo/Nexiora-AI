import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DEFAULT_PLAN_ENTITLEMENTS, ERROR_CODES } from '@nexiora/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AppConfigService } from '../../../bootstrap/app-config.service';
import { DomainError } from '../../../common/errors/domain-error';

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensurePlans();
  }

  listPlans() {
    return [
      {
        id: 'free',
        name: 'Free',
        monthlyPriceCents: 0,
        entitlements: DEFAULT_PLAN_ENTITLEMENTS.free,
      },
      {
        id: 'pro',
        name: 'Pro',
        monthlyPriceCents: 2000,
        entitlements: DEFAULT_PLAN_ENTITLEMENTS.pro,
      },
      {
        id: 'business',
        name: 'Business',
        monthlyPriceCents: 8000,
        entitlements: DEFAULT_PLAN_ENTITLEMENTS.business,
      },
    ];
  }

  async getSubscription(userId: string) {
    if (!(await this.prisma.isHealthy())) {
      return { planId: 'free', status: 'active', source: 'default' };
    }
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      return { planId: 'free', status: 'active', source: 'default' };
    }
    return {
      planId: sub.planId,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      source: 'database',
    };
  }

  /**
   * Creates a Stripe Checkout Session when Stripe is configured.
   * Without Stripe keys, returns a deterministic upgrade instruction payload (not a fake charge).
   */
  async createCheckout(userId: string, planId: 'pro' | 'business') {
    if (!this.config.stripeSecretKey || !this.config.stripePricePro) {
      return {
        mode: 'manual',
        message:
          'Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_PRO to enable checkout.',
        planId,
        userId,
      };
    }

    const priceId =
      planId === 'pro' ? this.config.stripePricePro : this.config.stripePriceBusiness;
    if (!priceId) {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, `No Stripe price for plan ${planId}`, 400);
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        success_url: `${this.config.publicWebUrl}/settings/subscription?checkout=success`,
        cancel_url: `${this.config.publicWebUrl}/pricing?checkout=cancel`,
        client_reference_id: userId,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Stripe checkout failed: ${text}`);
      throw new DomainError(ERROR_CODES.PROVIDER_UNAVAILABLE, 'Unable to create checkout session', 502);
    }

    const session = (await response.json()) as { id: string; url: string };
    return { mode: 'stripe', id: session.id, url: session.url };
  }

  private async ensurePlans(): Promise<void> {
    if (!(await this.prisma.isHealthy())) {
      this.logger.warn('Skipping plan seed — database unavailable');
      return;
    }
    try {
      for (const plan of this.listPlans()) {
        await this.prisma.plan.upsert({
          where: { id: plan.id },
          create: {
            id: plan.id,
            name: plan.name,
            monthlyPriceCents: plan.monthlyPriceCents,
            entitlements: plan.entitlements as unknown as Prisma.InputJsonValue,
          },
          update: {
            name: plan.name,
            monthlyPriceCents: plan.monthlyPriceCents,
            entitlements: plan.entitlements as unknown as Prisma.InputJsonValue,
          },
        });
      }
    } catch (error) {
      this.logger.warn(`Plan seed failed: ${(error as Error).message}`);
    }
  }
}

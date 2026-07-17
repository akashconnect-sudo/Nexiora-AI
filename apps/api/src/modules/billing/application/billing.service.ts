import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { DEFAULT_PLAN_ENTITLEMENTS, ERROR_CODES } from '@nexiora/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AppConfigService } from '../../../bootstrap/app-config.service';
import { DomainError } from '../../../common/errors/domain-error';

export type CheckoutPlanId = 'free' | 'pro' | 'business';

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
        activationFeeInr: 2,
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
      return {
        planId: 'free',
        status: 'unpaid',
        accessGranted: false,
        source: 'default',
        activationFeeInr: 2,
      };
    }
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      return {
        planId: 'free',
        status: 'unpaid',
        accessGranted: false,
        source: 'default',
        activationFeeInr: 2,
      };
    }
    const accessGranted = sub.status === 'active' || sub.status === 'trialing';
    return {
      planId: sub.planId,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      accessGranted,
      source: 'database',
      activationFeeInr: 2,
    };
  }

  async hasPaidAccess(userId: string): Promise<boolean> {
    const sub = await this.getSubscription(userId);
    return Boolean(sub.accessGranted);
  }

  /**
   * Creates a Stripe Checkout Session when Stripe is configured.
   * Free plan uses a one-time ₹2 INR payment with invoice generation.
   * Pro/Business use subscriptions (invoices created automatically).
   */
  async createCheckout(userId: string, planId: CheckoutPlanId) {
    if (!this.config.stripeSecretKey) {
      return {
        mode: 'manual',
        message: 'Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout.',
        planId,
        userId,
      };
    }

    const priceId =
      planId === 'free'
        ? this.config.stripePriceFree
        : planId === 'pro'
          ? this.config.stripePricePro
          : this.config.stripePriceBusiness;
    if (!priceId) {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, `No Stripe price for plan ${planId}`, 400);
    }

    const customerId = await this.ensureStripeCustomer(userId);
    const mode = planId === 'free' ? 'payment' : 'subscription';
    const params = new URLSearchParams({
      mode,
      success_url: `${this.config.publicWebUrl}/settings/subscription?checkout=success`,
      cancel_url: `${this.config.publicWebUrl}/settings/subscription?checkout=cancel`,
      client_reference_id: userId,
      customer: customerId,
      'metadata[userId]': userId,
      'metadata[planId]': planId,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
    });
    if (mode === 'subscription') {
      params.set('subscription_data[metadata][userId]', userId);
      params.set('subscription_data[metadata][planId]', planId);
    } else {
      // One-time Free activation: create a Stripe invoice/bill immediately.
      params.set('invoice_creation[enabled]', 'true');
      params.set('invoice_creation[invoice_data][description]', 'Nexiora Free activation — ₹2');
      params.set('invoice_creation[invoice_data][metadata][userId]', userId);
      params.set('invoice_creation[invoice_data][metadata][planId]', 'free');
    }

    const response = await this.stripeRequest('/checkout/sessions', params);

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Stripe checkout failed: ${text}`);
      throw new DomainError(ERROR_CODES.PROVIDER_UNAVAILABLE, 'Unable to create checkout session', 502);
    }

    const session = (await response.json()) as { id: string; url: string };
    return { mode: 'stripe', id: session.id, url: session.url };
  }

  async listInvoices(userId: string) {
    const customerId = await this.resolveStripeCustomerId(userId);
    if (!this.config.stripeSecretKey || !customerId) {
      return { configured: Boolean(this.config.stripeSecretKey), invoices: [] };
    }

    const [invoiceResponse, chargeResponse] = await Promise.all([
      this.stripeRequest(`/invoices?customer=${encodeURIComponent(customerId)}&limit=24`),
      this.stripeRequest(`/charges?customer=${encodeURIComponent(customerId)}&limit=24`),
    ]);

    if (!invoiceResponse.ok) {
      throw new DomainError(ERROR_CODES.PROVIDER_UNAVAILABLE, 'Unable to load invoices', 502);
    }

    const invoicePayload = (await invoiceResponse.json()) as {
      data: Array<{
        id: string;
        number: string | null;
        status: string | null;
        amount_paid: number;
        currency: string;
        created: number;
        hosted_invoice_url: string | null;
        invoice_pdf: string | null;
        description: string | null;
      }>;
    };

    const invoices = invoicePayload.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number ?? invoice.id,
      label: invoice.description ?? 'Nexiora payment',
      status: invoice.status,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      createdAt: new Date(invoice.created * 1000).toISOString(),
      hostedUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf,
      kind: 'invoice' as const,
    }));

    // Fallback/supplement: card receipts for any paid charge not yet represented as invoice.
    if (chargeResponse.ok) {
      const chargePayload = (await chargeResponse.json()) as {
        data: Array<{
          id: string;
          amount: number;
          currency: string;
          created: number;
          status: string;
          paid: boolean;
          receipt_url: string | null;
          description: string | null;
          invoice: string | null;
        }>;
      };
      for (const charge of chargePayload.data) {
        if (!charge.paid || charge.invoice) continue;
        if (invoices.some((invoice) => invoice.id === charge.id)) continue;
        invoices.push({
          id: charge.id,
          number: charge.id,
          label: charge.description ?? 'Nexiora payment receipt',
          status: charge.status,
          amountPaid: charge.amount,
          currency: charge.currency,
          createdAt: new Date(charge.created * 1000).toISOString(),
          hostedUrl: charge.receipt_url,
          pdfUrl: charge.receipt_url,
          kind: 'receipt' as const,
        });
      }
    }

    invoices.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return { configured: true, invoices };
  }

  private async ensureStripeCustomer(userId: string): Promise<string> {
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    if (existing?.stripeCustomerId) return existing.stripeCustomerId;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'User email is required for checkout', 400);
    }

    const response = await this.stripeRequest(
      '/customers',
      new URLSearchParams({
        email: user.email,
        name: user.displayName ?? user.email,
        'metadata[userId]': userId,
      }),
    );
    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Stripe customer create failed: ${text}`);
      throw new DomainError(ERROR_CODES.PROVIDER_UNAVAILABLE, 'Unable to create billing customer', 502);
    }
    const customer = (await response.json()) as { id: string };

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: 'free',
        status: 'unpaid',
        stripeCustomerId: customer.id,
      },
      update: {
        stripeCustomerId: customer.id,
      },
    });

    return customer.id;
  }

  private async resolveStripeCustomerId(userId: string): Promise<string | null> {
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });
    return existing?.stripeCustomerId ?? null;
  }

  async createPortal(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!this.config.stripeSecretKey || !subscription?.stripeCustomerId) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_ERROR,
        'No Stripe billing account is available yet.',
        400,
      );
    }
    const response = await this.stripeRequest(
      '/billing_portal/sessions',
      new URLSearchParams({
        customer: subscription.stripeCustomerId,
        return_url: `${this.config.publicWebUrl}/settings/subscription`,
      }),
    );
    if (!response.ok) {
      throw new DomainError(ERROR_CODES.PROVIDER_UNAVAILABLE, 'Unable to open billing portal', 502);
    }
    const portal = (await response.json()) as { url: string };
    return portal;
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    this.verifyWebhook(rawBody, signature);
    const event = JSON.parse(rawBody.toString('utf8')) as {
      type: string;
      data: { object: Record<string, unknown> };
    };
    const object = event.data.object;

    if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
      if (event.type === 'checkout.session.completed') {
        const userId = String(object.client_reference_id ?? '');
        const metadata = (object.metadata ?? {}) as Record<string, string>;
        const planId = this.normalizePlanId(metadata.planId);
        if (userId) {
          await this.prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              planId,
              status: 'active',
              stripeCustomerId: String(object.customer ?? '') || null,
              stripeSubId: String(object.subscription ?? '') || null,
            },
            update: {
              planId,
              status: 'active',
              stripeCustomerId: String(object.customer ?? '') || undefined,
              stripeSubId: String(object.subscription ?? '') || undefined,
            },
          });
        }
      }
    }

    if (event.type.startsWith('customer.subscription.')) {
      await this.syncSubscriptionEvent(object);
    }

    return { received: true };
  }

  private normalizePlanId(value: string | undefined): 'free' | 'pro' | 'business' {
    if (value === 'business' || value === 'pro' || value === 'free') return value;
    return 'free';
  }

  private async syncSubscriptionEvent(object: Record<string, unknown>) {
    const customerId = String(object.customer ?? '');
    const metadata = (object.metadata ?? {}) as Record<string, string>;
    const items = object.items as { data?: Array<{ price?: { id?: string } }> } | undefined;
    const priceId = items?.data?.[0]?.price?.id;
    const planId =
      metadata.planId === 'business' || priceId === this.config.stripePriceBusiness
        ? 'business'
        : metadata.planId === 'free' || priceId === this.config.stripePriceFree
          ? 'free'
          : 'pro';
    const currentPeriodEnd =
      typeof object.current_period_end === 'number'
        ? new Date(object.current_period_end * 1000)
        : null;
    const existing = metadata.userId
      ? await this.prisma.subscription.findUnique({ where: { userId: metadata.userId } })
      : await this.prisma.subscription.findUnique({ where: { stripeCustomerId: customerId } });
    if (!existing) return;

    await this.prisma.subscription.update({
      where: { id: existing.id },
      data: {
        planId,
        status: String(object.status ?? 'inactive'),
        stripeCustomerId: customerId,
        stripeSubId: String(object.id ?? existing.stripeSubId ?? ''),
        currentPeriodEnd,
      },
    });
  }

  private verifyWebhook(rawBody: Buffer, signature: string | undefined) {
    const secret = this.config.stripeWebhookSecret;
    if (!secret || !signature) {
      throw new DomainError(ERROR_CODES.FORBIDDEN, 'Invalid Stripe webhook signature', 401);
    }
    const parts = Object.fromEntries(signature.split(',').map((part) => part.split('=', 2)));
    const timestamp = parts.t;
    const received = parts.v1;
    if (!timestamp || !received) {
      throw new DomainError(ERROR_CODES.FORBIDDEN, 'Invalid Stripe webhook signature', 401);
    }
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new DomainError(ERROR_CODES.FORBIDDEN, 'Invalid Stripe webhook signature', 401);
    }
  }

  private stripeRequest(path: string, body?: URLSearchParams) {
    return fetch(`https://api.stripe.com/v1${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${this.config.stripeSecretKey}`,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body,
    });
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

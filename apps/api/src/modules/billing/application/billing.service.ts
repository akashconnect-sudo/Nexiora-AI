import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { DEFAULT_PLAN_ENTITLEMENTS, ERROR_CODES } from '@nexiora/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AppConfigService } from '../../../bootstrap/app-config.service';
import { DomainError } from '../../../common/errors/domain-error';

export type CheckoutPlanId = 'free' | 'pro' | 'business';

type LemonResource<T extends Record<string, unknown>> = {
  type: string;
  id: string;
  attributes: T;
};

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data: LemonResource<Record<string, unknown>>;
};

type BillingInvoice = {
  id: string;
  number: string;
  label: string;
  status: string;
  amountPaid: number;
  currency: string;
  createdAt: string;
  hostedUrl: string | null;
  pdfUrl: string | null;
  kind: 'invoice' | 'receipt';
};

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
    const accessGranted = hasActiveBillingStatus(sub.status, sub.currentPeriodEnd);
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

  async createCheckout(userId: string, requestedPlanId: unknown) {
    if (!isCheckoutPlanId(requestedPlanId)) {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'Invalid billing plan.', 400);
    }
    const planId = requestedPlanId;
    if (!this.config.lemonSqueezyApiKey || !this.config.lemonSqueezyStoreId) {
      return {
        mode: 'manual',
        message:
          'Lemon Squeezy is not configured. Set LEMON_SQUEEZY_API_KEY and LEMON_SQUEEZY_STORE_ID.',
        planId,
        userId,
      };
    }

    const variantId = this.variantIdForPlan(planId);
    if (!variantId) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_ERROR,
        `No Lemon Squeezy variant for ${planId}. Set LEMON_SQUEEZY_VARIANT_${planId.toUpperCase()}.`,
        400,
      );
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_ERROR,
        'User email is required for checkout.',
        400,
      );
    }

    const response = await this.lemonRequest('/checkouts', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            product_options: {
              redirect_url: `${this.config.publicWebUrl}/settings/subscription?checkout=success`,
              enabled_variants: [Number(variantId)],
              receipt_button_text: 'Return to Nexiora AI',
              receipt_link_url: `${this.config.publicWebUrl}/settings/subscription`,
            },
            checkout_options: {
              embed: false,
              logo: true,
              media: true,
              discount: planId !== 'free',
            },
            checkout_data: {
              email: user.email,
              name: user.displayName ?? user.email,
              custom: {
                user_id: userId,
                plan_id: planId,
              },
            },
            test_mode: this.config.lemonSqueezyTestMode,
          },
          relationships: {
            store: { data: { type: 'stores', id: this.config.lemonSqueezyStoreId } },
            variant: { data: { type: 'variants', id: variantId } },
          },
        },
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Lemon Squeezy checkout failed: ${text}`);
      throw new DomainError(
        ERROR_CODES.PROVIDER_UNAVAILABLE,
        lemonErrorMessage(text, 'Unable to create checkout.'),
        502,
      );
    }
    const checkout = (await response.json()) as {
      data: LemonResource<{ url: string }>;
    };
    return { mode: 'lemonsqueezy', id: checkout.data.id, url: checkout.data.attributes.url };
  }

  async listInvoices(userId: string) {
    if (!this.config.lemonSqueezyApiKey) {
      return { configured: false, invoices: [] };
    }
    const [subscription, user] = await Promise.all([
      this.prisma.subscription.findUnique({ where: { userId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);
    if (!user?.email) return { configured: true, invoices: [] };

    const orderFilters = new URLSearchParams({ 'page[size]': '24' });
    if (subscription?.externalCustomerId) {
      orderFilters.set('filter[customer_id]', subscription.externalCustomerId);
    } else {
      orderFilters.set('filter[user_email]', user.email);
    }
    const orderResponse = await this.lemonRequest(`/orders?${orderFilters.toString()}`);
    if (!orderResponse.ok) {
      throw new DomainError(ERROR_CODES.PROVIDER_UNAVAILABLE, 'Unable to load payments.', 502);
    }
    const orderPayload = (await orderResponse.json()) as {
      data: Array<
        LemonResource<{
          order_number: number;
          status: string;
          total: number;
          currency: string;
          created_at: string;
          first_order_item?: { product_name?: string; variant_name?: string };
          urls?: { receipt?: string };
        }>
      >;
    };
    const invoices: BillingInvoice[] = orderPayload.data.map((order) => ({
      id: `order_${order.id}`,
      number: String(order.attributes.order_number ?? order.id),
      label: order.attributes.first_order_item?.product_name ?? 'Nexiora payment',
      status: order.attributes.status,
      amountPaid: order.attributes.total,
      currency: order.attributes.currency,
      createdAt: order.attributes.created_at,
      hostedUrl: order.attributes.urls?.receipt ?? null,
      pdfUrl: null,
      kind: 'receipt' as const,
    }));

    if (subscription?.externalSubscriptionId) {
      const filters = new URLSearchParams({
        'filter[subscription_id]': subscription.externalSubscriptionId,
        'page[size]': '24',
      });
      const invoiceResponse = await this.lemonRequest(
        `/subscription-invoices?${filters.toString()}`,
      );
      if (invoiceResponse.ok) {
        const payload = (await invoiceResponse.json()) as {
          data: Array<
            LemonResource<{
              status: string;
              total: number;
              currency: string;
              created_at: string;
              urls?: { invoice_url?: string };
            }>
          >;
        };
        for (const invoice of payload.data) {
          invoices.push({
            id: `invoice_${invoice.id}`,
            number: invoice.id,
            label: 'Nexiora subscription payment',
            status: invoice.attributes.status,
            amountPaid: invoice.attributes.total,
            currency: invoice.attributes.currency,
            createdAt: invoice.attributes.created_at,
            hostedUrl: invoice.attributes.urls?.invoice_url ?? null,
            pdfUrl: null,
            kind: 'invoice' as const,
          });
        }
      }
    }

    invoices.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return { configured: true, invoices };
  }

  async createPortal(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!this.config.lemonSqueezyApiKey || !subscription?.externalSubscriptionId) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_ERROR,
        'No Lemon Squeezy subscription is available yet.',
        400,
      );
    }
    const response = await this.lemonRequest(
      `/subscriptions/${encodeURIComponent(subscription.externalSubscriptionId)}`,
    );
    if (!response.ok) {
      throw new DomainError(ERROR_CODES.PROVIDER_UNAVAILABLE, 'Unable to open billing portal.', 502);
    }
    const payload = (await response.json()) as {
      data: LemonResource<{ urls?: { customer_portal?: string } }>;
    };
    const url = payload.data.attributes.urls?.customer_portal;
    if (!url) {
      throw new DomainError(ERROR_CODES.PROVIDER_UNAVAILABLE, 'Billing portal is unavailable.', 502);
    }
    return { url };
  }

  async handleWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    headerEventName?: string,
  ) {
    verifyLemonSignature(rawBody, signature, this.config.lemonSqueezyWebhookSecret);
    let payload: LemonWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as LemonWebhookPayload;
    } catch {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'Invalid webhook payload.', 400);
    }
    const eventName = headerEventName ?? payload.meta?.event_name ?? '';
    if (!eventName || !payload.data?.id) {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'Invalid webhook event.', 400);
    }
    const eventKey = createHash('sha256')
      .update(`${eventName}:`)
      .update(rawBody)
      .digest('hex');
    const duplicate = await this.prisma.billingWebhookEvent.findUnique({ where: { eventKey } });
    if (duplicate) return { received: true, duplicate: true };

    if (eventName === 'order_created' || eventName === 'order_refunded') {
      await this.syncOrderEvent(eventName, payload);
    } else if (eventName.startsWith('subscription_') && payload.data.type === 'subscriptions') {
      await this.syncSubscriptionEvent(payload);
    }

    try {
      await this.prisma.billingWebhookEvent.create({
        data: {
          provider: 'lemonsqueezy',
          eventKey,
          eventName,
          resourceId: payload.data.id,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
    return { received: true };
  }

  private async syncOrderEvent(eventName: string, payload: LemonWebhookPayload) {
    const custom = payload.meta?.custom_data;
    const userId = String(custom?.user_id ?? '');
    const planId = normalizePlanId(custom?.plan_id);
    if (!userId || planId !== 'free') return;
    const attributes = payload.data.attributes;
    const customerId = String(attributes.customer_id ?? '') || null;
    const status = eventName === 'order_refunded' ? 'refunded' : 'active';
    const firstItem = attributes.first_order_item as { variant_id?: number | string } | undefined;
    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        planId: 'free',
        provider: 'lemonsqueezy',
        status,
        externalCustomerId: customerId,
        externalOrderId: payload.data.id,
        variantId: String(firstItem?.variant_id ?? '') || null,
      },
      update: {
        planId: 'free',
        provider: 'lemonsqueezy',
        status,
        externalCustomerId: customerId,
        externalOrderId: payload.data.id,
        externalSubscriptionId: null,
        currentPeriodEnd: null,
      },
    });
  }

  private async syncSubscriptionEvent(payload: LemonWebhookPayload) {
    const custom = payload.meta?.custom_data;
    const attributes = payload.data.attributes;
    const userId = String(custom?.user_id ?? '');
    const customerId = String(attributes.customer_id ?? '') || null;
    const subscriptionId = payload.data.id;
    const existing = userId
      ? await this.prisma.subscription.findUnique({ where: { userId } })
      : await this.prisma.subscription.findFirst({
          where: {
            OR: [
              { externalSubscriptionId: subscriptionId },
              ...(customerId ? [{ externalCustomerId: customerId }] : []),
            ],
          },
        });
    const resolvedUserId = userId || existing?.userId;
    if (!resolvedUserId) {
      this.logger.warn(`Ignoring unlinked Lemon Squeezy subscription ${subscriptionId}`);
      return;
    }
    const variantId = String(attributes.variant_id ?? '');
    const planId = normalizePlanId(custom?.plan_id) ?? this.planIdForVariant(variantId);
    const periodEnd = parseDate(attributes.ends_at ?? attributes.renews_at);
    const status = normalizeLemonStatus(String(attributes.status ?? 'inactive'));
    await this.prisma.subscription.upsert({
      where: { userId: resolvedUserId },
      create: {
        userId: resolvedUserId,
        planId,
        provider: 'lemonsqueezy',
        status,
        externalCustomerId: customerId,
        externalSubscriptionId: subscriptionId,
        externalOrderId: String(attributes.order_id ?? '') || null,
        variantId: variantId || null,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planId,
        provider: 'lemonsqueezy',
        status,
        externalCustomerId: customerId,
        externalSubscriptionId: subscriptionId,
        externalOrderId: String(attributes.order_id ?? '') || undefined,
        variantId: variantId || undefined,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  private variantIdForPlan(planId: CheckoutPlanId): string {
    if (planId === 'free') return this.config.lemonSqueezyVariantFree;
    if (planId === 'pro') return this.config.lemonSqueezyVariantPro;
    return this.config.lemonSqueezyVariantBusiness;
  }

  private planIdForVariant(variantId: string): CheckoutPlanId {
    if (variantId === this.config.lemonSqueezyVariantBusiness) return 'business';
    if (variantId === this.config.lemonSqueezyVariantFree) return 'free';
    return 'pro';
  }

  private lemonRequest(path: string, init?: RequestInit) {
    return fetch(`https://api.lemonsqueezy.com/v1${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${this.config.lemonSqueezyApiKey}`,
        ...init?.headers,
      },
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
            lemonSqueezyVariantId: this.variantIdForPlan(plan.id as CheckoutPlanId),
          },
          update: {
            name: plan.name,
            monthlyPriceCents: plan.monthlyPriceCents,
            entitlements: plan.entitlements as unknown as Prisma.InputJsonValue,
            lemonSqueezyVariantId: this.variantIdForPlan(plan.id as CheckoutPlanId),
          },
        });
      }
    } catch (error) {
      this.logger.warn(`Plan seed failed: ${(error as Error).message}`);
    }
  }
}

export function isCheckoutPlanId(value: unknown): value is CheckoutPlanId {
  return value === 'free' || value === 'pro' || value === 'business';
}

function normalizePlanId(value: unknown): CheckoutPlanId | null {
  return isCheckoutPlanId(value) ? value : null;
}

export function normalizeLemonStatus(status: string): string {
  if (status === 'on_trial') return 'trialing';
  if (
    status === 'active' ||
    status === 'paused' ||
    status === 'past_due' ||
    status === 'unpaid' ||
    status === 'cancelled' ||
    status === 'expired'
  ) {
    return status;
  }
  return 'inactive';
}

export function hasActiveBillingStatus(status: string, periodEnd?: Date | null): boolean {
  if (status === 'active' || status === 'trialing') return true;
  return status === 'cancelled' && Boolean(periodEnd && periodEnd.getTime() > Date.now());
}

export function verifyLemonSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): void {
  if (!secret || !signature) {
    throw new DomainError(
      ERROR_CODES.FORBIDDEN,
      'Invalid Lemon Squeezy webhook signature.',
      401,
    );
  }
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'), 'utf8');
  const received = Buffer.from(signature, 'utf8');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new DomainError(
      ERROR_CODES.FORBIDDEN,
      'Invalid Lemon Squeezy webhook signature.',
      401,
    );
  }
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function lemonErrorMessage(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      errors?: Array<{ detail?: string; title?: string }>;
    };
    const message = parsed.errors?.[0]?.detail?.trim() || parsed.errors?.[0]?.title?.trim();
    if (message) return message;
  } catch {
    /* ignore */
  }
  return fallback;
}

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { DEFAULT_PLAN_ENTITLEMENTS, ERROR_CODES } from '@nexiora/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AppConfigService } from '../../../bootstrap/app-config.service';
import { DomainError } from '../../../common/errors/domain-error';

export type CheckoutPlanId = 'free' | 'pro' | 'business';

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string;
  notes?: Record<string, string>;
};

type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  description?: string;
  fee?: number;
  tax?: number;
  captured?: boolean;
  amount_refunded?: number;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
  created_at?: number;
};

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPayment };
    order?: { entity?: RazorpayOrder };
  };
};

type BillingInvoice = {
  id: string;
  number: string;
  label: string;
  status: string;
  amountPaid: number;
  currency: string;
  createdAt: string;
  orderId: string;
  paymentId: string;
  planId: CheckoutPlanId;
  method: string | null;
  email: string | null;
  contact: string | null;
  fee: number | null;
  tax: number | null;
  amountRefunded: number;
  hostedUrl: string | null;
  pdfUrl: string | null;
  kind: 'invoice' | 'receipt';
};

/** Amounts in US cents. */
export const PLAN_AMOUNT_CENTS: Record<CheckoutPlanId, number> = {
  free: 200,
  pro: 2_000,
  business: 8_000,
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
        activationFeeUsd: 2,
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
        activationFeeUsd: 2,
      };
    }
    const sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      return {
        planId: 'free',
        status: 'unpaid',
        accessGranted: false,
        source: 'default',
        activationFeeUsd: 2,
      };
    }
    const accessGranted = hasActiveBillingStatus(sub.status, sub.currentPeriodEnd);
    return {
      planId: sub.planId,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
      accessGranted,
      source: 'database',
      activationFeeUsd: 2,
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
    if (!this.config.razorpayKeyId || !this.config.razorpayKeySecret) {
      return {
        mode: 'manual',
        message: 'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
        planId,
        userId,
      };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_ERROR,
        'User email is required for checkout.',
        400,
      );
    }

    const amount = PLAN_AMOUNT_CENTS[planId];
    const receipt = `nx_${planId}_${userId.replace(/-/g, '').slice(0, 12)}_${Date.now()
      .toString(36)
      .slice(-6)}`.slice(0, 40);
    const response = await this.razorpayRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        currency: 'USD',
        receipt,
        notes: {
          user_id: userId,
          plan_id: planId,
        },
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Razorpay order failed: ${text}`);
      throw new DomainError(
        ERROR_CODES.PROVIDER_UNAVAILABLE,
        razorpayErrorMessage(text, 'Unable to create checkout.'),
        502,
      );
    }
    const order = (await response.json()) as RazorpayOrder;
    const plan = this.listPlans().find((item) => item.id === planId)!;
    return {
      mode: 'razorpay',
      keyId: this.config.razorpayKeyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      planId,
      name: 'Nexiora AI',
      description: planId === 'free' ? 'Free plan activation' : `${plan.name} plan`,
      prefill: {
        email: user.email,
        name: user.displayName ?? user.email,
      },
      callbackUrl: `${this.config.publicWebUrl}/settings/subscription?checkout=success`,
    };
  }

  async verifyPayment(
    userId: string,
    body: {
      razorpay_order_id?: unknown;
      razorpay_payment_id?: unknown;
      razorpay_signature?: unknown;
      planId?: unknown;
    },
  ) {
    const orderId = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id : '';
    const paymentId = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id : '';
    const signature = typeof body.razorpay_signature === 'string' ? body.razorpay_signature : '';
    if (!orderId || !paymentId || !signature) {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'Missing Razorpay payment fields.', 400);
    }
    verifyRazorpayPaymentSignature(orderId, paymentId, signature, this.config.razorpayKeySecret);

    const paymentResponse = await this.razorpayRequest(
      `/payments/${encodeURIComponent(paymentId)}`,
    );
    if (!paymentResponse.ok) {
      throw new DomainError(ERROR_CODES.PROVIDER_UNAVAILABLE, 'Unable to verify payment.', 502);
    }
    const payment = (await paymentResponse.json()) as RazorpayPayment;
    if (payment.order_id !== orderId) {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'Payment order mismatch.', 400);
    }
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      throw new DomainError(
        ERROR_CODES.VALIDATION_ERROR,
        `Payment is not complete (${payment.status}).`,
        400,
      );
    }

    const planId =
      normalizePlanId(body.planId) ?? normalizePlanId(payment.notes?.plan_id) ?? 'free';
    const notesUserId = payment.notes?.user_id;
    if (notesUserId && notesUserId !== userId) {
      throw new DomainError(ERROR_CODES.FORBIDDEN, 'Payment does not belong to this user.', 403);
    }

    await this.activateSubscription({
      userId,
      planId,
      orderId,
      paymentId,
      customerId: null,
    });

    return { ok: true, planId, paymentId, orderId };
  }

  async listInvoices(userId: string) {
    if (!this.config.razorpayKeyId || !this.config.razorpayKeySecret) {
      return { configured: false, invoices: [] };
    }
    const subscription = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!subscription?.externalOrderId) {
      return { configured: true, invoices: [] };
    }

    const response = await this.razorpayRequest(
      `/orders/${encodeURIComponent(subscription.externalOrderId)}/payments`,
    );
    if (!response.ok) {
      this.logger.warn(
        `Unable to list Razorpay payments for order ${subscription.externalOrderId}`,
      );
      return { configured: true, invoices: [] };
    }
    const payload = (await response.json()) as { items?: RazorpayPayment[] };
    const invoices: BillingInvoice[] = (payload.items ?? []).map((payment) => ({
      id: payment.id,
      number: payment.id,
      label: 'Nexiora payment',
      status: payment.status,
      amountPaid: payment.amount,
      currency: payment.currency,
      createdAt: payment.created_at
        ? new Date(payment.created_at * 1000).toISOString()
        : new Date().toISOString(),
      orderId: payment.order_id,
      paymentId: payment.id,
      planId:
        normalizePlanId(payment.notes?.plan_id) ?? normalizePlanId(subscription.planId) ?? 'free',
      method: payment.method ?? null,
      email: payment.email ?? null,
      contact: payment.contact ?? null,
      fee: payment.fee ?? null,
      tax: payment.tax ?? null,
      amountRefunded: payment.amount_refunded ?? 0,
      hostedUrl: null,
      pdfUrl: null,
      kind: 'receipt' as const,
    }));
    return { configured: true, invoices };
  }

  async createPortal(_userId: string) {
    throw new DomainError(
      ERROR_CODES.VALIDATION_ERROR,
      'Razorpay customer portal is not available. Manage billing from Settings or contact support.',
      400,
    );
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined, _headerEventName?: string) {
    verifyRazorpayWebhookSignature(rawBody, signature, this.config.razorpayWebhookSecret);
    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookPayload;
    } catch {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'Invalid webhook payload.', 400);
    }
    const eventName = payload.event ?? '';
    const payment = payload.payload?.payment?.entity;
    const resourceId = payment?.id ?? payload.payload?.order?.entity?.id ?? '';
    if (!eventName) {
      throw new DomainError(ERROR_CODES.VALIDATION_ERROR, 'Invalid webhook event.', 400);
    }
    const eventKey = createHash('sha256').update(`${eventName}:`).update(rawBody).digest('hex');
    const duplicate = await this.prisma.billingWebhookEvent.findUnique({ where: { eventKey } });
    if (duplicate) return { received: true, duplicate: true };

    if (
      (eventName === 'payment.captured' || eventName === 'order.paid') &&
      payment?.notes?.user_id
    ) {
      const planId = normalizePlanId(payment.notes.plan_id) ?? 'free';
      await this.activateSubscription({
        userId: payment.notes.user_id,
        planId,
        orderId: payment.order_id,
        paymentId: payment.id,
        customerId: null,
      });
    }

    try {
      await this.prisma.billingWebhookEvent.create({
        data: {
          provider: 'razorpay',
          eventKey,
          eventName,
          resourceId: resourceId || null,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
    }
    return { received: true };
  }

  private async activateSubscription(input: {
    userId: string;
    planId: CheckoutPlanId;
    orderId: string;
    paymentId: string;
    customerId: string | null;
  }) {
    const periodEnd =
      input.planId === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.prisma.subscription.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        planId: input.planId,
        provider: 'razorpay',
        status: 'active',
        externalCustomerId: input.customerId,
        externalOrderId: input.orderId,
        externalSubscriptionId: input.paymentId,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planId: input.planId,
        provider: 'razorpay',
        status: 'active',
        externalCustomerId: input.customerId ?? undefined,
        externalOrderId: input.orderId,
        externalSubscriptionId: input.paymentId,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  private razorpayRequest(path: string, init?: RequestInit) {
    const auth = Buffer.from(
      `${this.config.razorpayKeyId}:${this.config.razorpayKeySecret}`,
    ).toString('base64');
    return fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
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

export function isCheckoutPlanId(value: unknown): value is CheckoutPlanId {
  return value === 'free' || value === 'pro' || value === 'business';
}

function normalizePlanId(value: unknown): CheckoutPlanId | null {
  return isCheckoutPlanId(value) ? value : null;
}

export function hasActiveBillingStatus(status: string, periodEnd?: Date | null): boolean {
  if (status === 'active' || status === 'trialing') return true;
  return status === 'cancelled' && Boolean(periodEnd && periodEnd.getTime() > Date.now());
}

export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): void {
  if (!secret || !signature) {
    throw new DomainError(ERROR_CODES.FORBIDDEN, 'Invalid Razorpay payment signature.', 401);
  }
  const expected = Buffer.from(
    createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex'),
    'utf8',
  );
  const received = Buffer.from(signature, 'utf8');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new DomainError(ERROR_CODES.FORBIDDEN, 'Invalid Razorpay payment signature.', 401);
  }
}

export function verifyRazorpayWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): void {
  if (!secret || !signature) {
    throw new DomainError(ERROR_CODES.FORBIDDEN, 'Invalid Razorpay webhook signature.', 401);
  }
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'), 'utf8');
  const received = Buffer.from(signature, 'utf8');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new DomainError(ERROR_CODES.FORBIDDEN, 'Invalid Razorpay webhook signature.', 401);
  }
}

function razorpayErrorMessage(raw: string, fallback: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      error?: { description?: string; reason?: string };
    };
    const message = parsed.error?.description?.trim() || parsed.error?.reason?.trim();
    if (message) return message;
  } catch {
    /* ignore */
  }
  return fallback;
}

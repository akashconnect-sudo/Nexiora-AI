import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  hasActiveBillingStatus,
  isCheckoutPlanId,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from './billing.service';

describe('Razorpay billing helpers', () => {
  it('accepts only checkout plan IDs', () => {
    expect(isCheckoutPlanId('free')).toBe(true);
    expect(isCheckoutPlanId('pro')).toBe(true);
    expect(isCheckoutPlanId('business')).toBe(true);
    expect(isCheckoutPlanId('enterprise')).toBe(false);
    expect(isCheckoutPlanId(undefined)).toBe(false);
  });

  it('keeps cancelled subscriptions active until their paid period ends', () => {
    expect(hasActiveBillingStatus('cancelled', new Date(Date.now() + 60_000))).toBe(true);
    expect(hasActiveBillingStatus('cancelled', new Date(Date.now() - 60_000))).toBe(false);
    expect(hasActiveBillingStatus('expired', new Date(Date.now() + 60_000))).toBe(false);
  });

  it('verifies Razorpay checkout payment signatures', () => {
    const orderId = 'order_test';
    const paymentId = 'pay_test';
    const secret = 'test-signing-secret';
    const signature = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

    expect(() =>
      verifyRazorpayPaymentSignature(orderId, paymentId, signature, secret),
    ).not.toThrow();
    expect(() => verifyRazorpayPaymentSignature(orderId, 'pay_other', signature, secret)).toThrow(
      'Invalid Razorpay payment signature.',
    );
  });

  it('verifies the exact raw webhook body', () => {
    const body = Buffer.from('{"event":"payment.captured"}');
    const secret = 'test-webhook-secret';
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    expect(() => verifyRazorpayWebhookSignature(body, signature, secret)).not.toThrow();
    expect(() =>
      verifyRazorpayWebhookSignature(Buffer.from(`${body.toString()} `), signature, secret),
    ).toThrow('Invalid Razorpay webhook signature.');
  });
});

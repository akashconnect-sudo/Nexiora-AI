import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  hasActiveBillingStatus,
  isCheckoutPlanId,
  normalizeLemonStatus,
  verifyLemonSignature,
} from './billing.service';

describe('Lemon Squeezy billing helpers', () => {
  it('accepts only checkout plan IDs', () => {
    expect(isCheckoutPlanId('free')).toBe(true);
    expect(isCheckoutPlanId('pro')).toBe(true);
    expect(isCheckoutPlanId('business')).toBe(true);
    expect(isCheckoutPlanId('enterprise')).toBe(false);
    expect(isCheckoutPlanId(undefined)).toBe(false);
  });

  it('maps Lemon Squeezy trial status to the internal status', () => {
    expect(normalizeLemonStatus('on_trial')).toBe('trialing');
    expect(normalizeLemonStatus('active')).toBe('active');
    expect(normalizeLemonStatus('past_due')).toBe('past_due');
    expect(normalizeLemonStatus('unknown')).toBe('inactive');
  });

  it('keeps cancelled subscriptions active until their paid period ends', () => {
    expect(hasActiveBillingStatus('cancelled', new Date(Date.now() + 60_000))).toBe(true);
    expect(hasActiveBillingStatus('cancelled', new Date(Date.now() - 60_000))).toBe(false);
    expect(hasActiveBillingStatus('expired', new Date(Date.now() + 60_000))).toBe(false);
  });

  it('verifies the exact raw webhook body', () => {
    const body = Buffer.from('{"data":{"id":"42"}}');
    const secret = 'test-signing-secret';
    const signature = createHmac('sha256', secret).update(body).digest('hex');

    expect(() => verifyLemonSignature(body, signature, secret)).not.toThrow();
    expect(() => verifyLemonSignature(Buffer.from(`${body.toString()} `), signature, secret)).toThrow(
      'Invalid Lemon Squeezy webhook signature.',
    );
  });
});

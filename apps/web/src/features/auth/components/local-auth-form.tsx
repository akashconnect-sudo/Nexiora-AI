'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@nexiora/ui';
import { apiUrl } from '@/lib/api-url';
import { setSession } from '@/lib/session';

type Step = 'email' | 'code';

type LocalAuthFormProps = {
  mode: 'sign-in' | 'sign-up';
};

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  return raw;
}

function errorMessage(body: Record<string, unknown>, fallback: string): string {
  for (const key of ['detail', 'message', 'title', 'error'] as const) {
    const value = body[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

/**
 * Email OTP login that works without Clerk.
 * Codes are emailed when Resend/SMTP is configured; otherwise a local fallback appears.
 */
export function LocalAuthForm({ mode }: LocalAuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [delivery, setDelivery] = useState<'dev_inbox' | 'email' | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/v1/auth/local/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(45_000),
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(errorMessage(body, 'Could not send code'));
      }
      setChallengeId(String(body.challengeId ?? ''));
      setDelivery(body.delivery === 'email' ? 'email' : 'dev_inbox');
      setDevCode(typeof body.devCode === 'string' ? body.devCode : null);
      setStatusMessage(typeof body.message === 'string' ? body.message : null);
      setStep('code');
    } catch (err) {
      const message = (err as Error).message;
      setError(
        message === 'signal timed out' || message.includes('TimeoutError')
          ? 'Server took too long. On Vercel set RESEND_API_KEY and redeploy; locally ensure the API is running.'
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/v1/auth/local/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, code }),
        signal: AbortSignal.timeout(45_000),
      });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(errorMessage(body, 'Could not verify code'));
      }
      const user = body.user as {
        id: string;
        email: string;
        displayName: string;
      };
      setSession(String(body.accessToken ?? ''), {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      });
      // Always land on billing after login so unpaid users activate Free ($2).
      router.push('/settings/subscription');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      {step === 'email' ? (
        <form onSubmit={requestCode} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-nx-ink">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 h-11 w-full rounded-nx border border-nx-border bg-nx-elevated px-3 text-nx-ink outline-none ring-nx-accent focus:ring-2"
              placeholder="you@company.com"
            />
          </div>
          {error ? <p className="text-sm text-nx-danger">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Sending…' : mode === 'sign-up' ? 'Continue' : 'Email me a code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <p className="text-sm text-nx-muted">
            {statusMessage ?? (
              <>
                Enter the 6-digit code sent to <span className="text-nx-ink">{email}</span>.
              </>
            )}
          </p>
          {delivery === 'email' ? (
            <p className="rounded-nx border border-nx-border bg-nx-elevated px-3 py-2 text-sm text-nx-muted">
              Check your inbox (and spam folder) for the Nexiora login code.
            </p>
          ) : null}
          {delivery === 'dev_inbox' && devCode ? (
            <p className="rounded-nx border border-nx-border bg-nx-accent-soft/50 px-3 py-2 text-sm text-nx-ink">
              Local code (no email server configured): <strong>{devCode}</strong>
            </p>
          ) : null}
          <div>
            <label htmlFor="code" className="text-sm font-medium text-nx-ink">
              Verification code
            </label>
            <input
              id="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-2 h-11 w-full rounded-nx border border-nx-border bg-nx-elevated px-3 tracking-[0.3em] text-nx-ink outline-none ring-nx-accent focus:ring-2"
              placeholder="••••••"
            />
          </div>
          {error ? <p className="text-sm text-nx-danger">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Checking…' : 'Log in'}
          </Button>
          <button
            type="button"
            className="text-sm text-nx-muted hover:text-nx-accent"
            onClick={() => {
              setStep('email');
              setCode('');
              setDevCode(null);
              setDelivery(null);
              setStatusMessage(null);
              setError(null);
            }}
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}

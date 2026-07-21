'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@nexiora/ui';
import { apiUrl } from '@/lib/api-url';
import { setSession } from '@/lib/session';
import { postAuthDestination } from '@/lib/auth-navigation';
import { GoogleIcon } from './google-auth-button';
import { ClerkEmailAuthForm } from './clerk-email-auth-form';

type Step = 'email' | 'code';

type LocalAuthFormProps = {
  mode: 'sign-in' | 'sign-up';
  googleEnabled?: boolean;
};

function errorMessage(body: Record<string, unknown>, fallback: string): string {
  for (const key of ['detail', 'message', 'title', 'error'] as const) {
    const value = body[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return fallback;
}

/**
 * Passwordless email authentication, with optional Google OAuth through Clerk.
 */
export function LocalAuthForm({ mode, googleEnabled = false }: LocalAuthFormProps) {
  return googleEnabled ? <ClerkEmailAuthForm mode={mode} /> : <LocalOtpForm mode={mode} />;
}

function LocalOtpForm({ mode }: Pick<LocalAuthFormProps, 'mode'>) {
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
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(
      () => setResendIn((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function requestCode(event?: FormEvent) {
    event?.preventDefault();
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
      setResendIn(30);
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
      const destination = await postAuthDestination(
        String(body.accessToken ?? ''),
        searchParams?.get('next') ?? null,
      );
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      {step === 'email' ? (
        <>
          <div>
            <button
              type="button"
              disabled
              className="auth-google-button cursor-not-allowed"
              title="Add Clerk keys to enable Google sign-in"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
            <p className="mt-2 text-center text-[11px] text-nx-muted">
              Google sign-in activates when Clerk keys are configured.
            </p>
          </div>

          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-nx-border" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-nx-muted">
              or continue with email
            </span>
            <span className="h-px flex-1 bg-nx-border" />
          </div>

          <form onSubmit={(event) => void requestCode(event)} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-nx-ink">
                Email address
              </label>
              <div className="auth-input-shell mt-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  aria-hidden="true"
                  className="h-[18px] w-[18px] text-nx-muted"
                >
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="m4.5 7 7.5 6 7.5-6" />
                </svg>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-nx-ink outline-none placeholder:text-nx-muted/70"
                  placeholder="you@company.com"
                />
              </div>
            </div>
            {error ? (
              <p className="text-sm text-nx-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="h-12 w-full" disabled={busy}>
              {busy
                ? 'Sending secure code…'
                : mode === 'sign-up'
                  ? 'Create account with email'
                  : 'Continue with email'}
            </Button>
          </form>
        </>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <div className="auth-code-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 3 5 6v5c0 4.6 2.8 8.3 7 10 4.2-1.7 7-5.4 7-10V6l-7-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <p className="text-center text-sm leading-6 text-nx-muted" aria-live="polite">
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
            <label htmlFor="code" className="sr-only">
              Verification code
            </label>
            <input
              id="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="h-14 w-full rounded-xl border border-nx-border bg-nx-bg/70 px-4 text-center font-mono text-xl tracking-[0.5em] text-nx-ink outline-none transition focus:border-nx-accent focus:ring-2 focus:ring-nx-accent/25"
              placeholder="000000"
            />
          </div>
          {error ? (
            <p className="text-sm text-nx-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-12 w-full" disabled={busy || code.length !== 6}>
            {busy
              ? 'Verifying…'
              : mode === 'sign-up'
                ? 'Verify & create account'
                : 'Verify & log in'}
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <button
              type="button"
              className="text-nx-muted transition hover:text-nx-accent"
              onClick={() => {
                setStep('email');
                setCode('');
                setDevCode(null);
                setDelivery(null);
                setStatusMessage(null);
                setError(null);
              }}
            >
              Change email
            </button>
            <span className="text-nx-border" aria-hidden="true">
              •
            </span>
            <button
              type="button"
              disabled={busy || resendIn > 0}
              className="text-nx-accent transition disabled:text-nx-muted"
              onClick={() => void requestCode()}
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

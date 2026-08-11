'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, useSignIn, useSignUp } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@nexiora/ui';
import { safeNextPath } from '@/lib/auth-navigation';
import { clerkErrorMessage, isAlreadySignedInError } from '../lib/clerk-errors';
import { GoogleAuthButton } from './google-auth-button';

type ClerkEmailAuthFormProps = {
  mode: 'sign-in' | 'sign-up';
};

export function ClerkEmailAuthForm({ mode }: ClerkEmailAuthFormProps) {
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const loaded = mode === 'sign-in' ? signInLoaded : signUpLoaded;
  const next = safeNextPath(searchParams?.get('next') ?? null);

  useEffect(() => {
    if (!authLoaded || !isSignedIn) return;
    // Existing Clerk session after a partial logout — finish Nexiora session exchange.
    router.replace(`/auth/complete?next=${encodeURIComponent(next)}`);
  }, [authLoaded, isSignedIn, next, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function finishSignIn(sessionId: string) {
    await setSignInActive?.({ session: sessionId });
    router.push(`/auth/complete?next=${encodeURIComponent(next)}`);
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (!loaded) return;
    if (isSignedIn) {
      router.replace(`/auth/complete?next=${encodeURIComponent(next)}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'sign-in') {
        if (!signIn) throw new Error('Clerk sign-in is not ready.');
        const attempt = await signIn.create({
          identifier: email.trim().toLowerCase(),
          password,
        });
        if (attempt.status !== 'complete' || !attempt.createdSessionId) {
          throw new Error('Login needs an additional verification step.');
        }
        await finishSignIn(attempt.createdSessionId);
        return;
      } else {
        if (!signUp) throw new Error('Clerk sign-up is not ready.');
        await signUp.create({
          emailAddress: email.trim().toLowerCase(),
          password,
          unsafeMetadata: { displayName: displayName.trim() },
        });
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      }
      setStep('code');
      setResendIn(30);
    } catch (cause) {
      if (isAlreadySignedInError(cause)) {
        router.replace(`/auth/complete?next=${encodeURIComponent(next)}`);
        return;
      }
      setError(clerkErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!loaded) return;
    setBusy(true);
    setError(null);
    try {
      if (!signUp) throw new Error('Clerk sign-up is not ready.');
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status !== 'complete' || !attempt.createdSessionId) {
        throw new Error('Account setup needs additional information.');
      }
      await setSignUpActive?.({ session: attempt.createdSessionId });
      router.push(`/auth/complete?next=${encodeURIComponent(next)}`);
    } catch (cause) {
      setError(clerkErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (authLoaded && isSignedIn) {
    return (
      <div className="mt-6 space-y-3 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-nx-border border-t-nx-accent" />
        <p className="text-sm text-nx-muted">Finishing your existing session…</p>
      </div>
    );
  }

  if (step === 'code') {
    return (
      <form onSubmit={verifyCode} className="mt-6 space-y-4">
        <div className="auth-code-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M12 3 5 6v5c0 4.6 2.8 8.3 7 10 4.2-1.7 7-5.4 7-10V6l-7-3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <p className="text-center text-sm leading-6 text-nx-muted" aria-live="polite">
          Enter the 6-digit code Clerk sent to <span className="text-nx-ink">{email}</span>.
        </p>
        <label htmlFor="clerk-code" className="sr-only">
          Verification code
        </label>
        <input
          id="clerk-code"
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
        {error ? (
          <p className="text-sm text-nx-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-12 w-full" disabled={busy || code.length !== 6}>
          {busy ? 'Verifying…' : 'Verify & create account'}
        </Button>
        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            className="text-nx-muted transition hover:text-nx-accent"
            onClick={() => {
              setStep('email');
              setCode('');
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
            onClick={() => void sendCode()}
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-6">
      <GoogleAuthButton nextPath={searchParams?.get('next') ?? null} />
      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-nx-border" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-nx-muted">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-nx-border" />
      </div>
      <form onSubmit={(event) => void sendCode(event)} className="space-y-4">
        {mode === 'sign-up' ? (
          <div>
            <label htmlFor="clerk-display-name" className="text-sm font-medium text-nx-ink">
              Display name
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
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6" />
              </svg>
              <input
                id="clerk-display-name"
                type="text"
                required
                minLength={3}
                maxLength={40}
                autoFocus
                autoComplete="nickname"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="h-12 min-w-0 flex-1 bg-transparent text-sm text-nx-ink outline-none placeholder:text-nx-muted/70"
                placeholder="YourName@Nova#27"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-nx-muted">
              Letters, capital letters, numbers, @, # and spaces are allowed.
            </p>
          </div>
        ) : null}
        <div>
          <label htmlFor="clerk-email" className="text-sm font-medium text-nx-ink">
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
              id="clerk-email"
              type="email"
              required
              autoFocus={mode === 'sign-in'}
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-nx-ink outline-none placeholder:text-nx-muted/70"
              placeholder="you@example.com"
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="clerk-password" className="text-sm font-medium text-nx-ink">
              Password
            </label>
            {mode === 'sign-in' ? (
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-nx-accent transition hover:underline"
              >
                Forgot password?
              </Link>
            ) : null}
          </div>
          <div className="auth-input-shell mt-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
              className="h-[18px] w-[18px] text-nx-muted"
            >
              <rect x="4" y="10" width="16" height="10" rx="3" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            <input
              id="clerk-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-nx-ink outline-none placeholder:text-nx-muted/70"
              placeholder="Enter a secure password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="text-xs font-medium text-nx-muted transition hover:text-nx-accent"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-nx-danger" role="alert">
            {error}
          </p>
        ) : null}
        {mode === 'sign-up' ? (
          <div className="auth-captcha-shell">
            <div
              id="clerk-captcha"
              data-cl-theme="dark"
              data-cl-size="flexible"
              data-cl-language="en-US"
            />
            <p>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <path d="M12 3 5 6v5c0 4.6 2.8 8.3 7 10 4.2-1.7 7-5.4 7-10V6l-7-3Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Protected by Cloudflare Turnstile
            </p>
          </div>
        ) : null}
        <Button type="submit" className="h-12 w-full" disabled={busy || !loaded}>
          {busy
            ? mode === 'sign-up'
              ? 'Creating secure account…'
              : 'Logging in…'
            : mode === 'sign-up'
              ? 'Create account'
              : 'Log in securely'}
        </Button>
      </form>
    </div>
  );
}

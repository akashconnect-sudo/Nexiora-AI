'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useClerk, useSignIn } from '@clerk/nextjs';
import { Button } from '@nexiora/ui';
import { clerkErrorMessage } from '../lib/clerk-errors';

type Step = 'email' | 'reset';

/**
 * Clerk password reset: email → email code + new password → back to login.
 * Clerk emails a reset code; the user finishes the reset on this page.
 */
export function ForgotPasswordForm() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { signOut } = useClerk();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestReset(event: FormEvent) {
    event.preventDefault();
    if (!isLoaded || !signIn) return;
    setBusy(true);
    setError(null);
    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim().toLowerCase(),
      });
      setStep('reset');
    } catch (cause) {
      setError(clerkErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword(event: FormEvent) {
    event.preventDefault();
    if (!isLoaded || !signIn) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password,
      });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive?.({ session: result.createdSessionId });
        // Sign out so the user logs in again with the new password.
        await signOut({ redirectUrl: '/sign-in?reset=1' });
        return;
      }
      throw new Error('Password reset needs another verification step. Please try again.');
    } catch (cause) {
      setError(clerkErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (step === 'reset') {
    return (
      <form onSubmit={(event) => void submitNewPassword(event)} className="mt-8 space-y-4">
        <p className="text-sm leading-6 text-nx-muted">
          We sent a reset code to <span className="text-nx-ink">{email}</span>. Enter that code and
          choose a new password.
        </p>
        <div>
          <label htmlFor="reset-code" className="text-sm font-medium text-nx-ink">
            Reset code
          </label>
          <input
            id="reset-code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            className="mt-2 h-14 w-full rounded-xl border border-nx-border bg-nx-bg/70 px-4 text-center font-mono text-xl tracking-[0.5em] text-nx-ink outline-none transition focus:border-nx-accent focus:ring-2 focus:ring-nx-accent/25"
            placeholder="000000"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="text-sm font-medium text-nx-ink">
            New password
          </label>
          <div className="auth-input-shell mt-2">
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-nx-ink outline-none placeholder:text-nx-muted/70"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="text-xs font-medium text-nx-muted transition hover:text-nx-accent"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="confirm-password" className="text-sm font-medium text-nx-ink">
            Confirm password
          </label>
          <div className="auth-input-shell mt-2">
            <input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-nx-ink outline-none placeholder:text-nx-muted/70"
              placeholder="Re-enter new password"
            />
          </div>
        </div>
        {error ? (
          <p className="text-sm text-nx-danger" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-12 w-full" disabled={busy || code.length !== 6}>
          {busy ? 'Updating password…' : 'Reset password'}
        </Button>
        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            type="button"
            className="text-nx-muted transition hover:text-nx-accent"
            onClick={() => {
              setStep('email');
              setCode('');
              setPassword('');
              setConfirmPassword('');
              setError(null);
            }}
          >
            Change email
          </button>
          <span className="text-nx-border" aria-hidden="true">
            •
          </span>
          <Link href="/sign-in" className="text-nx-accent transition hover:underline">
            Back to login
          </Link>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={(event) => void requestReset(event)} className="mt-8 space-y-4">
      <p className="text-sm leading-6 text-nx-muted">
        Enter the email on your account. We will send a password reset message with a code you can
        use here.
      </p>
      <div>
        <label htmlFor="forgot-email" className="text-sm font-medium text-nx-ink">
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
            id="forgot-email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm text-nx-ink outline-none placeholder:text-nx-muted/70"
            placeholder="you@example.com"
          />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-nx-danger" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="h-12 w-full" disabled={busy || !isLoaded}>
        {busy ? 'Sending reset email…' : 'Send reset email'}
      </Button>
      <p className="text-center text-sm text-nx-muted">
        Remembered it?{' '}
        <Link href="/sign-in" className="font-medium text-nx-accent hover:underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}

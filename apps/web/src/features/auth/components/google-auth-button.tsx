'use client';

import { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { safeNextPath } from '@/lib/auth-navigation';

export function GoogleAuthButton({ nextPath }: { nextPath: string | null }) {
  const { isLoaded, signIn } = useSignIn();
  const [error, setError] = useState<string | null>(null);

  async function continueWithGoogle() {
    if (!isLoaded || !signIn) return;
    setError(null);
    try {
      const next = safeNextPath(nextPath);
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: `/auth/complete?next=${encodeURIComponent(next)}`,
      });
    } catch (cause) {
      setError((cause as Error).message || 'Google sign-in could not start.');
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void continueWithGoogle()}
        disabled={!isLoaded}
        className="auth-google-button"
      >
        <GoogleIcon />
        <span>{isLoaded ? 'Continue with Google' : 'Connecting to Google…'}</span>
      </button>
      {error ? (
        <p className="mt-2 text-sm text-nx-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.19-2.07H12v3.91h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.71 0 4.98-.9 6.64-2.43l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.62 0-4.84-1.77-5.64-4.15H3.02v2.62A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.36 13.84A6.01 6.01 0 0 1 6.05 12c0-.64.11-1.27.31-1.84V7.54H3.02A10 10 0 0 0 2 12c0 1.61.39 3.14 1.02 4.46l3.34-2.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.01c1.47 0 2.78.5 3.81 1.49l2.89-2.89A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.98 5.54l3.34 2.62C7.16 7.78 9.38 6.01 12 6.01Z"
      />
    </svg>
  );
}

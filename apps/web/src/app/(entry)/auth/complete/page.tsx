import { Suspense } from 'react';
import Link from 'next/link';
import { AuthCompleteClient } from '@/features/auth/components/auth-complete-client';

export default function AuthCompletePage() {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <Suspense fallback={<AuthCompleteFallback />}>
        <AuthCompleteClient />
      </Suspense>
    );
  }

  return (
    <main className="auth-stage grid min-h-svh place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-nx-border bg-nx-elevated/90 p-8 text-center shadow-xl">
        <p className="font-display text-xl font-semibold text-nx-ink">
          Google sign-in is not configured
        </p>
        <p className="mt-3 text-sm leading-6 text-nx-muted">
          Use email authentication or add the Clerk keys to enable Google.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 inline-flex rounded-xl bg-nx-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          Return to login
        </Link>
      </div>
    </main>
  );
}

function AuthCompleteFallback() {
  return (
    <main className="auth-stage grid min-h-svh place-items-center px-4">
      <div className="rounded-2xl border border-nx-border bg-nx-elevated/90 p-8 text-center shadow-xl">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-nx-border border-t-nx-accent" />
        <p className="mt-4 text-sm text-nx-muted">Preparing your Nexiora workspace…</p>
      </div>
    </main>
  );
}

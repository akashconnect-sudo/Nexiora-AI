import Link from 'next/link';
import { SsoCallbackClient } from '@/features/auth/components/sso-callback-client';

export default function SsoCallbackPage() {
  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <SsoCallbackClient />;
  }

  return (
    <main className="auth-stage grid min-h-svh place-items-center px-4">
      <div className="max-w-sm rounded-2xl border border-nx-border bg-nx-elevated/90 p-8 text-center shadow-xl">
        <h1 className="font-display text-xl font-semibold text-nx-ink">
          Google sign-in is not configured
        </h1>
        <p className="mt-3 text-sm leading-6 text-nx-muted">
          Add the Clerk publishable key and enable Google in Clerk to use this login method.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 inline-flex rounded-xl bg-nx-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          Use email instead
        </Link>
      </div>
    </main>
  );
}

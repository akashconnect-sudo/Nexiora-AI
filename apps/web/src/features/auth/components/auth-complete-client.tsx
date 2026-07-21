'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiUrl } from '@/lib/api-url';
import { postAuthDestination } from '@/lib/auth-navigation';
import { setSession } from '@/lib/session';

export function AuthCompleteClient() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setError('Google did not return an active session. Please try again.');
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error('Google session token was unavailable.');
        const response = await fetch(apiUrl('/v1/auth/clerk/exchange'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${clerkToken}` },
        });
        const body = (await response.json().catch(() => ({}))) as {
          accessToken?: string;
          user?: { id: string; email: string; displayName: string | null };
          message?: string;
          title?: string;
        };
        if (!response.ok || !body.accessToken || !body.user) {
          throw new Error(body.message ?? body.title ?? 'Could not create your Nexiora session.');
        }
        if (cancelled) return;
        setSession(body.accessToken, body.user);
        const destination = await postAuthDestination(
          body.accessToken,
          searchParams?.get('next') ?? null,
        );
        if (!cancelled) {
          router.replace(destination);
          router.refresh();
        }
      } catch (cause) {
        if (!cancelled) setError((cause as Error).message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, router, searchParams]);

  return (
    <main className="auth-stage grid min-h-svh place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-nx-border bg-nx-elevated/90 p-8 text-center shadow-xl">
        {error ? (
          <>
            <p className="font-display text-xl font-semibold text-nx-ink">
              Sign-in needs another try
            </p>
            <p className="mt-3 text-sm leading-6 text-nx-danger">{error}</p>
            <Link
              href="/sign-in"
              className="mt-6 inline-flex rounded-xl bg-nx-accent px-4 py-2.5 text-sm font-semibold text-white"
            >
              Return to login
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-nx-border border-t-nx-accent" />
            <p className="mt-4 text-sm text-nx-muted">Preparing your Nexiora workspace…</p>
          </>
        )}
      </div>
    </main>
  );
}

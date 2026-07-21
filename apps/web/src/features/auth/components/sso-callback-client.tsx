'use client';

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export function SsoCallbackClient() {
  return (
    <main className="auth-stage grid min-h-svh place-items-center px-4">
      <div className="rounded-2xl border border-nx-border bg-nx-elevated/90 p-8 text-center shadow-xl">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-nx-border border-t-nx-accent" />
        <p className="mt-4 text-sm text-nx-muted">Completing secure Google sign-in…</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </main>
  );
}

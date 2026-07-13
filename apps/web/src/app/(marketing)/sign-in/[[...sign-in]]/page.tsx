import { Suspense } from 'react';
import { LocalAuthForm } from '@/features/auth/components/local-auth-form';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Log in | Nexiora AI',
  description: 'Sign in to Nova Search to keep history, bookmarks, and higher search limits.',
  path: '/sign-in',
  noIndex: true,
});

export default function SignInPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="font-display text-3xl font-semibold text-nx-ink">Log in to Nexiora</h1>
      <p className="mt-3 text-sm leading-relaxed text-nx-muted">
        Enter your email and we will send a one-time code. No password to remember.
      </p>
      <Suspense fallback={<p className="mt-8 text-sm text-nx-muted">Loading…</p>}>
        <LocalAuthForm mode="sign-in" />
      </Suspense>
    </div>
  );
}

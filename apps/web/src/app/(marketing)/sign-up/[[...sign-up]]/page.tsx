import { Suspense } from 'react';
import { LocalAuthForm } from '@/features/auth/components/local-auth-form';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Create account | Nexiora AI',
  description: 'Create a Nexiora account to use Nova Search with saved history and bookmarks.',
  path: '/sign-up',
  noIndex: true,
});

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="font-display text-3xl font-semibold text-nx-ink">Create your Nexiora account</h1>
      <p className="mt-3 text-sm leading-relaxed text-nx-muted">
        Use your email to get a one-time code. Free accounts include limited Nova Search with full
        citations.
      </p>
      <Suspense fallback={<p className="mt-8 text-sm text-nx-muted">Loading…</p>}>
        <LocalAuthForm mode="sign-up" />
      </Suspense>
    </div>
  );
}

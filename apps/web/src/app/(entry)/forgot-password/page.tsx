import Link from 'next/link';
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Forgot password | Nexiora AI',
  description: 'Reset your Nexiora account password.',
  path: '/forgot-password',
  noIndex: true,
});

export default function ForgotPasswordPage() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <main className="auth-stage">
      <div className="auth-aurora auth-aurora-one" />
      <div className="auth-aurora auth-aurora-two" />
      <div className="auth-shell">
        <section className="auth-panel auth-enter">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="group flex items-center gap-3" aria-label="Nexiora AI home">
              <span className="auth-logo-wrap">
                <img src="/icon.png" alt="" className="h-full w-full" />
              </span>
              <span>
                <span className="block font-display text-base font-semibold tracking-tight text-nx-ink">
                  Nexiora AI
                </span>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-nx-muted">
                  Verified intelligence
                </span>
              </span>
            </Link>
            <Link
              href="/sign-in"
              className="text-xs font-medium text-nx-muted transition hover:text-nx-accent"
            >
              Log in
            </Link>
          </header>

          <div className="mt-10 sm:mt-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-nx-accent">
              Account recovery
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-nx-ink sm:text-4xl">
              Reset your password
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-nx-muted">
              We will email you a reset code so you can choose a new password and sign in again.
            </p>

            {clerkEnabled ? (
              <ForgotPasswordForm />
            ) : (
              <div className="mt-8 rounded-xl border border-nx-border bg-nx-elevated/60 p-4 text-sm leading-6 text-nx-muted">
                Password reset is available when Clerk email authentication is configured. Local OTP
                sign-in does not use a password.
                <div className="mt-4">
                  <Link href="/sign-in" className="font-medium text-nx-accent hover:underline">
                    Back to login
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

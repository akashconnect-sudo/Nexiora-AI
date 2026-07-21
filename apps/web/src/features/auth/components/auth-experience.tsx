import Link from 'next/link';
import { LocalAuthForm } from './local-auth-form';

type AuthExperienceProps = {
  mode: 'sign-in' | 'sign-up';
  googleEnabled: boolean;
  nextPath?: string | null;
};

export function AuthExperience({ mode, googleEnabled, nextPath = null }: AuthExperienceProps) {
  const isSignUp = mode === 'sign-up';
  const signInHref = nextPath ? `/sign-in?next=${encodeURIComponent(nextPath)}` : '/sign-in';
  const signUpHref = nextPath ? `/sign-up?next=${encodeURIComponent(nextPath)}` : '/sign-up';

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
              href="/product"
              className="text-xs font-medium text-nx-muted transition hover:text-nx-accent"
            >
              Explore product
            </Link>
          </header>

          <div className="mt-10 sm:mt-12">
            <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
              <Link
                href={signInHref}
                role="tab"
                aria-selected={!isSignUp}
                className={!isSignUp ? 'is-active' : undefined}
              >
                Log in
              </Link>
              <Link
                href={signUpHref}
                role="tab"
                aria-selected={isSignUp}
                className={isSignUp ? 'is-active' : undefined}
              >
                Create account
              </Link>
            </div>

            <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-nx-accent">
              {isSignUp ? 'Start your workspace' : 'Welcome back'}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-nx-ink sm:text-4xl">
              {isSignUp ? 'Turn questions into evidence.' : 'Continue where curiosity led you.'}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-nx-muted">
              {isSignUp
                ? 'Create your Nexiora account and search the live web with ranked, checkable sources.'
                : 'Access your searches, saved evidence, live briefings, and research workspace.'}
            </p>

            <LocalAuthForm mode={mode} googleEnabled={googleEnabled} />

            <p className="mt-6 text-center text-xs leading-5 text-nx-muted">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-nx-ink underline-offset-4 hover:underline">
                Terms
              </Link>{' '}
              and acknowledge our{' '}
              <Link href="/privacy" className="text-nx-ink underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-nx-border/70 pt-5 text-xs text-nx-muted">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-nx-accent shadow-[0_0_10px_var(--nx-accent)]" />
              Passwordless and encrypted
            </span>
            <a href="mailto:support@nexiora.ai" className="transition hover:text-nx-accent">
              Need help?
            </a>
          </footer>
        </section>

        <section className="auth-story auth-enter auth-enter-delay" aria-label="Nexiora preview">
          <div className="auth-story-grid" />
          <div className="auth-orbit auth-orbit-one" />
          <div className="auth-orbit auth-orbit-two" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
                Nova evidence engine
              </p>
              <span className="auth-live-pill">
                <span />
                Live
              </span>
            </div>

            <div className="mx-auto w-full max-w-xl py-12">
              <p className="auth-story-kicker">One question. A defensible answer.</p>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white xl:text-5xl">
                Search beyond the answer.
                <span className="block text-white/45">See why it is true.</span>
              </h2>

              <div className="auth-query-card">
                <div className="flex items-center gap-3">
                  <span className="auth-query-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <circle cx="11" cy="11" r="6.5" />
                      <path d="m16 16 4 4" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      What changed in AI safety policy this week?
                    </p>
                    <p className="mt-1 text-xs text-white/45">Searching 28 trusted sources…</p>
                  </div>
                </div>
                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="auth-progress h-full w-[86%] rounded-full bg-nx-accent" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_170px]">
                <div className="auth-answer-card">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/45">
                      Synthesized answer
                    </span>
                    <span className="text-xs text-nx-accent">6 citations</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-white/75">
                    New guidance prioritizes model evaluations, incident reporting, and transparent
                    risk thresholds before deployment.
                  </p>
                  <div className="mt-4 flex gap-2">
                    {['Nature', 'NIST', 'arXiv'].map((source, index) => (
                      <span key={source} className="auth-source-chip">
                        <b>{index + 1}</b>
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="auth-trust-card">
                  <svg viewBox="0 0 92 92" className="mx-auto h-24 w-24 -rotate-90">
                    <circle
                      cx="46"
                      cy="46"
                      r="38"
                      fill="none"
                      stroke="white"
                      strokeOpacity=".08"
                      strokeWidth="7"
                    />
                    <circle
                      className="auth-trust-ring"
                      cx="46"
                      cy="46"
                      r="38"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="7"
                      strokeLinecap="round"
                      pathLength="100"
                      strokeDasharray="92 100"
                    />
                  </svg>
                  <div className="-mt-[68px] text-center">
                    <strong className="font-display text-2xl text-white">92</strong>
                    <span className="block text-[10px] uppercase tracking-wider text-white/40">
                      Trust score
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 text-xs text-white/40">
              <span>Citations before confidence.</span>
              <span>Freshness · Authority · Consensus</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

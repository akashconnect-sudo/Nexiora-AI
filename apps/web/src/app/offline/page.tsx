import Link from 'next/link';

export const metadata = {
  title: 'Offline — Nexiora AI',
};

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-nx-bg px-5 py-12 text-nx-ink">
      <section className="w-full max-w-md rounded-3xl border border-nx-border bg-nx-elevated p-7 text-center shadow-xl sm:p-9">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-nx-accent/30 bg-nx-accent-soft text-nx-accent">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M5.5 16.5a4 4 0 0 1 .4-7.9A6.5 6.5 0 0 1 18.3 7a4.5 4.5 0 0 1 .2 9" />
            <path d="m4 4 16 16" />
          </svg>
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-nx-accent">
          Connection paused
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Nexiora is offline
        </h1>
        <p className="mt-3 text-sm leading-6 text-nx-muted">
          Your private searches are never served from an offline cache. Reconnect to continue with
          fresh sources and verified answers.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-nx-accent px-5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Try reconnecting
        </Link>
      </section>
    </main>
  );
}

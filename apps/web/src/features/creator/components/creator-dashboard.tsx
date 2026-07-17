'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nexiora/ui';
import { creatorFetch } from '@/lib/creator-api';
import { getSessionUser } from '@/lib/session';

type Rec = {
  id: string;
  topic: string;
  why: string;
  kind: string;
  scores: {
    opportunityScore: number;
    confidenceScore: number;
    competition: number;
    cpmScore: number;
  };
  bestUploadWindow?: string;
  disclaimer: string;
};

type DashboardPayload = {
  greeting: string;
  subtitle: string;
  needsOnboarding: boolean;
  todaysBest: Rec[];
  breakingTrends: Array<{ title: string; url: string; source: string; why: string; kind: string }>;
  upcomingTrends: Rec[];
  highCpm: Rec[];
  lowCompetition: Rec[];
  highSearchVolume: Rec[];
  coach: Array<{ id: string; title: string; body: string; why: string; kind: string }>;
  disclaimer: string;
};

function KindBadge({ kind }: { kind: string }) {
  const label =
    kind === 'verified' ? 'From your channel' : kind === 'signal' ? 'From the news' : 'Suggested';
  return (
    <span className="rounded-md bg-nx-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-nx-accent">
      {label}
    </span>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-xs text-nx-muted">
      {label} <span className="font-semibold text-nx-ink">{value}</span>
    </span>
  );
}

export function CreatorDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSessionUser()) {
      router.replace('/sign-in?next=/creator');
      return;
    }
    void creatorFetch<DashboardPayload>('/dashboard')
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [router]);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <p className="rounded-nx border border-nx-danger/30 bg-nx-elevated p-4 text-sm text-nx-muted">
          {error}. Log in again if your session expired.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
        <p className="text-sm text-nx-muted">Building today’s creator brief…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="creator-glass rounded-2xl border border-nx-border/80 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-nx-accent">
          Creator Intelligence
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-nx-ink sm:text-4xl">
          {data.greeting}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-nx-muted">{data.subtitle}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {data.needsOnboarding ? (
            <Link href="/creator/onboarding">
              <Button>Finish setup</Button>
            </Link>
          ) : null}
          <Link href="/creator/opportunities">
            <Button variant="secondary">All opportunities</Button>
          </Link>
          <Link href="/creator/ideas">
            <Button variant="ghost">Idea studio</Button>
          </Link>
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-nx-ink">
              Today’s best opportunities
            </h2>
            <p className="mt-1 text-sm text-nx-muted">
              Each idea includes a short reason it was suggested.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {data.todaysBest.map((item) => (
            <article
              key={item.id}
              className="creator-glass rounded-2xl border border-nx-border/70 p-5 transition hover:border-nx-accent/40"
            >
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
                <h3 className="font-display text-lg font-semibold text-nx-ink">{item.topic}</h3>
                <KindBadge kind={item.kind} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-nx-muted">{item.why}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ScorePill label="Opportunity" value={item.scores.opportunityScore} />
                <ScorePill label="Confidence" value={item.scores.confidenceScore} />
                <ScorePill label="Competition" value={item.scores.competition} />
              </div>
              {item.bestUploadWindow ? (
                <p className="mt-3 text-xs text-nx-accent">
                  Upload window: {item.bestUploadWindow}
                </p>
              ) : null}
              <Link
                href={`/creator/ideas?topic=${encodeURIComponent(item.topic)}`}
                className="mt-4 inline-block text-sm font-medium text-nx-accent hover:underline"
              >
                Generate ideas →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-lg font-semibold text-nx-ink">Breaking trends</h2>
          <ul className="mt-4 space-y-3">
            {data.breakingTrends.slice(0, 6).map((item) => (
              <li
                key={item.url}
                className="rounded-xl border border-nx-border/60 bg-nx-elevated/50 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <KindBadge kind={item.kind} />
                  <span className="text-xs text-nx-muted">{item.source}</span>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-sm font-medium text-nx-ink hover:text-nx-accent"
                >
                  {item.title}
                </a>
                <p className="mt-1 text-xs text-nx-muted">{item.why}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-nx-ink">AI coach</h2>
          <ul className="mt-4 space-y-3">
            {data.coach.map((tip) => (
              <li
                key={tip.id}
                className="rounded-xl border border-nx-border/60 bg-nx-elevated/50 px-4 py-3"
              >
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-nx-ink">{tip.title}</p>
                  <KindBadge kind={tip.kind} />
                </div>
                <p className="mt-2 text-sm text-nx-muted">{tip.body}</p>
                <p className="mt-2 text-xs text-nx-muted">Why: {tip.why}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/creator/coach"
            className="mt-4 inline-block text-sm text-nx-accent hover:underline"
          >
            Full coach →
          </Link>
        </section>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: 'Higher earnings potential',
            items: data.highCpm,
            href: '/creator/opportunities',
          },
          {
            title: 'Lower competition',
            items: data.lowCompetition,
            href: '/creator/opportunities',
          },
          {
            title: 'Stronger search interest',
            items: data.highSearchVolume,
            href: '/creator/opportunities',
          },
        ].map((col) => (
          <section
            key={col.title}
            className="rounded-2xl border border-nx-border/70 bg-nx-elevated/40 p-4"
          >
            <h2 className="font-display text-base font-semibold text-nx-ink">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.items.slice(0, 4).map((item) => (
                <li key={item.id} className="text-sm text-nx-muted">
                  <span className="font-medium text-nx-ink">{item.topic}</span>
                  <span className="mt-0.5 block text-xs">Score {item.scores.opportunityScore}</span>
                </li>
              ))}
            </ul>
            <Link
              href={col.href}
              className="mt-3 inline-block text-xs text-nx-accent hover:underline"
            >
              View all
            </Link>
          </section>
        ))}
      </div>
    </div>
  );
}

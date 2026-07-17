'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { creatorFetch } from '@/lib/creator-api';
import { getSessionUser } from '@/lib/session';

type Trend = {
  topic: string;
  trendScore: number;
  source: string;
  url: string;
  category: string;
  kind: string;
  why: string;
  publishedAt: string;
};

export function CreatorTrends() {
  const router = useRouter();
  const [items, setItems] = useState<Trend[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSessionUser()) {
      router.replace('/sign-in?next=/creator/trends');
      return;
    }
    void creatorFetch<{ items: Trend[]; disclaimer: string }>('/trends')
      .then((body) => {
        setItems(body.items);
        setDisclaimer(body.disclaimer);
      })
      .catch((err: Error) => setError(err.message));
  }, [router]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <h1 className="font-display text-3xl font-semibold text-nx-ink">Trend discovery</h1>
      <p className="mt-2 text-sm text-nx-muted">{disclaimer}</p>
      {error ? <p className="mt-4 text-sm text-nx-danger">{error}</p> : null}
      <ul className="mt-8 divide-y divide-nx-border overflow-hidden rounded-2xl border border-nx-border bg-nx-elevated/50">
        {items.map((item) => (
          <li key={item.url} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs text-nx-muted">
                {item.category} · {item.source}
              </p>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block font-medium leading-snug text-nx-ink hover:text-nx-accent"
              >
                {item.topic}
              </a>
              <p className="mt-1 text-xs leading-relaxed text-nx-muted">{item.why}</p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-2xl font-semibold text-nx-accent">{item.trendScore}</p>
              <p className="text-[10px] uppercase text-nx-muted">Trend score</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

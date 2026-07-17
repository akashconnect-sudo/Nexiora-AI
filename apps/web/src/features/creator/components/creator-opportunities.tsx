'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { creatorFetch } from '@/lib/creator-api';
import { getSessionUser } from '@/lib/session';

type Opp = {
  id: string;
  topic: string;
  why: string;
  kind: string;
  scores: {
    opportunityScore: number;
    confidenceScore: number;
    searchDemand: number;
    competition: number;
    growthSpeed: number;
    cpmScore: number;
  };
  bestUploadWindow?: string;
  disclaimer: string;
};

export function CreatorOpportunities() {
  const router = useRouter();
  const [items, setItems] = useState<Opp[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSessionUser()) {
      router.replace('/sign-in?next=/creator/opportunities');
      return;
    }
    void creatorFetch<{ items: Opp[]; disclaimer: string }>('/opportunities')
      .then((body) => {
        setItems(body.items);
        setDisclaimer(body.disclaimer);
      })
      .catch((err: Error) => setError(err.message));
  }, [router]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <h1 className="font-display text-3xl font-semibold text-nx-ink">Content opportunities</h1>
      <p className="mt-2 text-sm text-nx-muted">
        {disclaimer || 'Ranked by how strong the opportunity looks today.'}
      </p>
      {error ? <p className="mt-4 text-sm text-nx-danger">{error}</p> : null}
      <ul className="mt-8 space-y-4">
        {items.map((item) => (
          <li key={item.id} className="creator-glass rounded-2xl border border-nx-border/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="font-display text-lg font-semibold text-nx-ink">{item.topic}</h2>
              <span className="text-sm font-semibold text-nx-accent">
                Score {item.scores.opportunityScore}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-nx-muted">{item.why}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-nx-muted">
              <span>Interest {item.scores.searchDemand}</span>
              <span>Competition {item.scores.competition}</span>
              <span>Momentum {item.scores.growthSpeed}</span>
              <span>Earnings potential {item.scores.cpmScore}</span>
              <span>Confidence {item.scores.confidenceScore}</span>
            </div>
            <Link
              href={`/creator/ideas?topic=${encodeURIComponent(item.topic)}`}
              className="mt-4 inline-block text-sm text-nx-accent hover:underline"
            >
              Open in idea studio →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

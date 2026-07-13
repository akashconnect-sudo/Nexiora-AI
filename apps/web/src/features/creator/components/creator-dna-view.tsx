'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { creatorFetch } from '@/lib/creator-api';
import { getSessionUser } from '@/lib/session';

type DnaPayload = {
  disclaimer: string;
  dna: Record<string, unknown>;
};

export function CreatorDnaView() {
  const router = useRouter();
  const [data, setData] = useState<DnaPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSessionUser()) {
      router.replace('/sign-in?next=/creator/dna');
      return;
    }
    void creatorFetch<DnaPayload>('/dna')
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, [router]);

  if (error) {
    return <p className="px-8 py-10 text-sm text-nx-danger">{error}</p>;
  }
  if (!data) {
    return <p className="px-8 py-10 text-sm text-nx-muted">Loading Creator DNA…</p>;
  }

  const dna = data.dna;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <h1 className="font-display text-3xl font-semibold text-nx-ink">Creator DNA</h1>
      <p className="mt-2 text-sm text-nx-muted">{data.disclaimer}</p>
      <p className="mt-2 text-xs text-nx-accent">
        Source: {String(dna.metricsProvenance) === 'verified' ? 'Your channel' : 'Estimated from your profile'}
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {Object.entries(dna).map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-nx-border/70 bg-nx-elevated/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-nx-muted">
              {key.replace(/([A-Z])/g, ' $1')}
            </p>
            <p className="mt-2 text-sm text-nx-ink">
              {Array.isArray(value)
                ? value.length
                  ? value.join(', ')
                  : '—'
                : value === null || value === undefined || value === ''
                  ? '—'
                  : String(value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { creatorFetch } from '@/lib/creator-api';
import { getSessionUser } from '@/lib/session';

type Tip = { id: string; title: string; body: string; why: string; kind: string };

export function CreatorCoach() {
  const router = useRouter();
  const [tips, setTips] = useState<Tip[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSessionUser()) {
      router.replace('/sign-in?next=/creator/coach');
      return;
    }
    void creatorFetch<{ tips: Tip[]; disclaimer: string }>('/coach')
      .then((body) => {
        setTips(body.tips);
        setDisclaimer(body.disclaimer);
      })
      .catch((err: Error) => setError(err.message));
  }, [router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <h1 className="font-display text-3xl font-semibold text-nx-ink">AI growth coach</h1>
      <p className="mt-2 text-sm text-nx-muted">{disclaimer}</p>
      {error ? <p className="mt-4 text-sm text-nx-danger">{error}</p> : null}
      <ul className="mt-8 space-y-4">
        {tips.map((tip) => (
          <li key={tip.id} className="creator-glass rounded-2xl border border-nx-border/70 p-5">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-lg font-semibold text-nx-ink">{tip.title}</h2>
              <span className="text-[10px] font-semibold uppercase text-nx-accent">
                {tip.kind === 'verified' ? 'From your channel' : tip.kind === 'signal' ? 'From the news' : 'Suggested'}
              </span>
            </div>
            <p className="mt-3 text-sm text-nx-muted">{tip.body}</p>
            <p className="mt-3 text-xs text-nx-muted">Why: {tip.why}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

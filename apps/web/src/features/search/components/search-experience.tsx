'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@nexiora/ui';
import { NewsFeed } from '@/features/news/components/news-feed';
import { AnswerContent } from '@/features/search/components/answer-content';
import { UpgradeModal } from '@/components/upgrade-modal';
import { authHeaders } from '@/lib/session';
import { loadPrefs } from '@/lib/prefs';
import { decodeHtmlEntities } from '@nexiora/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type Citation = {
  ordinal: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  trustScore: number;
  confidence: number;
  isOfficial: boolean;
  sourceType: string;
  publishedAt?: string;
};

type SearchStatus =
  'idle' | 'starting' | 'retrieving' | 'generating' | 'completed' | 'partial' | 'failed';

type StreamEvent =
  | { type: 'search.status'; status: string }
  | { type: 'search.citations'; citations: Citation[] }
  | { type: 'search.token'; field: 'summary' | 'detailed'; text: string }
  | { type: 'search.enrichment'; key: string; data: unknown }
  | { type: 'search.done'; searchId: string }
  | { type: 'search.error'; code: string; message: string };

type SearchExperienceProps = {
  initialQuery?: string;
  initialMode?: string;
};

const MODES = [
  {
    id: 'universal',
    label: 'Universal',
    hint: 'Best for everyday questions across the open web.',
    placeholder: 'Ask anything — answers come with sources',
  },
  {
    id: 'research',
    label: 'Research',
    hint: 'Best for deeper topics, papers, and reference material.',
    placeholder: 'Ask a research question…',
  },
  {
    id: 'news',
    label: 'News',
    hint: 'Best for recent headlines and current events.',
    placeholder: 'Ask about today’s news…',
  },
] as const;

type ModeId = (typeof MODES)[number]['id'];

function trustLabel(score: number): string {
  if (score >= 80) return 'High trust';
  if (score >= 60) return 'Good trust';
  if (score >= 40) return 'Moderate trust';
  return 'Lower trust';
}

function sourceLabel(type: string): string {
  const map: Record<string, string> = {
    web: 'Web',
    news: 'News',
    academic: 'Research',
    government: 'Government',
    docs: 'Docs',
    github: 'GitHub',
    youtube: 'YouTube',
    blog: 'Blog',
    social: 'Social',
    reddit: 'Discussion',
    hn: 'Tech news',
    pdf: 'Document',
    other: 'Source',
  };
  return map[type] ?? 'Source';
}

export function SearchExperience({ initialQuery = '', initialMode }: SearchExperienceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<ModeId>((initialMode as ModeId) || 'universal');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [summary, setSummary] = useState('');
  const [detailed, setDetailed] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [related, setRelated] = useState<string[]>([]);
  const [better, setBetter] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latencyHint, setLatencyHint] = useState<string | null>(null);
  const [citationTarget, setCitationTarget] = useState<'_blank' | '_self'>('_blank');
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!initialMode) {
      const prefs = loadPrefs();
      setMode(prefs.defaultMode);
    }
    setCitationTarget(loadPrefs().openCitationsInNewTab ? '_blank' : '_self');
  }, [initialMode]);

  const resetResult = useCallback(() => {
    setSummary('');
    setDetailed('');
    setCitations([]);
    setRelated([]);
    setBetter([]);
    setConfidence(null);
    setError(null);
    setLatencyHint(null);
  }, []);

  const consumeStream = useCallback(async (id: string) => {
    const started = Date.now();
    const response = await fetch(`${API_URL}/v1/search/${id}/stream`, {
      headers: { Accept: 'text/event-stream', ...authHeaders() },
    });
    if (!response.ok || !response.body) {
      throw new Error('Could not load the live answer stream. Please try again.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const applyEvent = (event: StreamEvent) => {
      switch (event.type) {
        case 'search.status':
          if (
            event.status === 'retrieving' ||
            event.status === 'generating' ||
            event.status === 'completed' ||
            event.status === 'partial' ||
            event.status === 'failed'
          ) {
            setStatus(event.status);
          }
          break;
        case 'search.citations':
          setCitations(
            event.citations.map((c) => ({
              ...c,
              title: decodeHtmlEntities(c.title),
              snippet: decodeHtmlEntities(c.snippet),
            })),
          );
          break;
        case 'search.token':
          if (event.field === 'summary') {
            setSummary((prev) => prev + event.text);
          } else {
            setDetailed((prev) => prev + event.text);
          }
          break;
        case 'search.enrichment':
          if (event.key === 'relatedQuestions' && Array.isArray(event.data)) {
            setRelated(event.data as string[]);
          }
          if (event.key === 'betterQueries' && Array.isArray(event.data)) {
            setBetter(event.data as string[]);
          }
          break;
        case 'search.done':
          setStatus('completed');
          setLatencyHint(`${((Date.now() - started) / 1000).toFixed(1)}s`);
          break;
        case 'search.error':
          setStatus('failed');
          setError(event.message);
          break;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
      for (const chunk of chunks) {
        const dataLine = chunk.split('\n').find((line) => line.startsWith('data:'));
        if (!dataLine) continue;
        const json = dataLine.replace(/^data:\s?/, '');
        try {
          applyEvent(JSON.parse(json) as StreamEvent);
        } catch {
          /* ignore malformed */
        }
      }
    }

    const finalRes = await fetch(`${API_URL}/v1/search/${id}`, {
      headers: { ...authHeaders() },
    });
    if (finalRes.ok) {
      const finalBody = (await finalRes.json()) as {
        status: SearchStatus;
        answer?: { confidence: number; summary: string; detailedMarkdown: string };
        citations?: Citation[];
        relatedQuestions?: string[];
        betterQueries?: string[];
        latencyMs?: number;
      };
      setStatus(finalBody.status);
      if (finalBody.answer) {
        setSummary(decodeHtmlEntities(finalBody.answer.summary));
        setDetailed(decodeHtmlEntities(finalBody.answer.detailedMarkdown));
        setConfidence(finalBody.answer.confidence);
      }
      if (finalBody.citations) {
        setCitations(
          finalBody.citations.map((c) => ({
            ...c,
            title: decodeHtmlEntities(c.title),
            snippet: decodeHtmlEntities(c.snippet),
          })),
        );
      }
      if (finalBody.relatedQuestions) setRelated(finalBody.relatedQuestions);
      if (finalBody.betterQueries) setBetter(finalBody.betterQueries);
      if (finalBody.latencyMs) setLatencyHint(`${(finalBody.latencyMs / 1000).toFixed(1)}s`);
    }
  }, []);

  const runSearch = useCallback(
    async (q: string, nextMode: ModeId = mode) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      resetResult();
      setStatus('starting');
      setError(null);

      try {
        const response = await fetch(`${API_URL}/v1/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ query: trimmed, mode: nextMode }),
        });

        if (!response.ok) {
          const problem = (await response.json().catch(() => null)) as {
            code?: string;
            detail?: string;
            upgradeRequired?: boolean;
            paymentRequired?: boolean;
          } | null;
          setStatus('failed');
          setError(problem?.detail ?? 'Search could not be completed. Please try again.');
          if (
            problem?.code === 'QUOTA_EXCEEDED' ||
            problem?.code === 'PAYMENT_REQUIRED' ||
            problem?.upgradeRequired ||
            problem?.paymentRequired
          ) {
            setShowUpgrade(true);
          }
          return;
        }

        const created = (await response.json()) as {
          id: string;
          quota?: { limitType: 'lifetime' | 'daily'; remaining: number };
        };
        setStatus('retrieving');
        await consumeStream(created.id);
        if (created.quota?.limitType === 'lifetime' && created.quota.remaining === 0) {
          setShowUpgrade(true);
        }
      } catch {
        setStatus('failed');
        setError('Something went wrong while searching. Please try again.');
      }
    },
    [consumeStream, resetResult, mode],
  );

  useEffect(() => {
    if (initialQuery.trim()) {
      void runSearch(initialQuery, (initialMode as ModeId) || mode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  function updateUrl(nextMode: ModeId, nextQuery: string) {
    const params = new URLSearchParams();
    params.set('mode', nextMode);
    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    window.history.replaceState(null, '', `/search?${params.toString()}`);
  }

  function onModeChange(nextMode: ModeId) {
    setMode(nextMode);
    const trimmed = query.trim();
    updateUrl(nextMode, trimmed);

    if (!trimmed) {
      resetResult();
      setStatus('idle');
      return;
    }

    void runSearch(trimmed, nextMode);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    updateUrl(mode, query);
    void runSearch(query, mode);
  }

  const activeMode = MODES.find((item) => item.id === mode) ?? MODES[0];
  const hasAnswer = Boolean(summary || detailed);
  const isBusy = status === 'retrieving' || status === 'generating' || status === 'starting';
  const showNewsBrowse = mode === 'news' && status === 'idle' && !hasAnswer;

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'starting':
        return 'Starting…';
      case 'retrieving':
        return 'Finding trusted sources…';
      case 'generating':
        return 'Writing your answer…';
      case 'completed':
        return 'Answer ready';
      case 'partial':
        return 'Partial answer';
      case 'failed':
        return 'Could not finish';
      default:
        return activeMode.hint;
    }
  }, [status, activeMode.hint]);

  const starters =
    mode === 'research'
      ? [
          'Transformer architecture survey',
          'Climate science latest findings',
          'CRISPR gene editing overview',
        ]
      : mode === 'news'
        ? ['AI regulation this week', 'Global markets today', 'Cybersecurity incidents']
        : [
            'What is Nova Search?',
            'How do citations improve AI answers?',
            'Best practices for source verification',
          ];

  return (
    <div className="py-2">
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Search mode">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            className={`rounded-nx px-3 py-1.5 text-sm transition ${
              mode === item.id
                ? 'bg-nx-accent text-white'
                : 'border border-nx-border text-nx-muted hover:text-nx-ink'
            }`}
            onClick={() => onModeChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="mb-4 text-sm text-nx-muted">{activeMode.hint}</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row" role="search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={activeMode.placeholder}
          className="h-12 w-full flex-1 rounded-nx border border-nx-border bg-nx-elevated px-4 text-base outline-none ring-nx-accent focus:ring-2"
        />
        <Button type="submit" className="h-12 w-full px-6 sm:w-auto" disabled={isBusy}>
          {isBusy ? 'Searching…' : 'Search'}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-nx-muted">
        <span>{statusLabel}</span>
        {latencyHint ? <span>· {latencyHint}</span> : null}
      </div>

      {error ? (
        <p className="mt-6 rounded-nx border border-nx-danger/40 bg-nx-elevated p-4 text-sm leading-relaxed text-nx-danger">
          {error}
        </p>
      ) : null}

      {showNewsBrowse ? (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-nx-ink">Live headlines</h2>
              <p className="mt-1 text-sm text-nx-muted">
                Browse stories below, or search above for a sourced news briefing.
              </p>
            </div>
            <Link href="/news" className="text-sm text-nx-accent hover:underline">
              Full news
            </Link>
          </div>
          <NewsFeed limit={10} showCategoryTabs={false} />
        </section>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            {!hasAnswer && !isBusy && !error ? (
              <div className="rounded-2xl border border-dashed border-nx-border bg-nx-elevated/40 p-6">
                <h2 className="font-display text-lg font-semibold text-nx-ink">
                  {mode === 'research' ? 'Start a research search' : 'Ask a question'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-nx-muted">
                  Your answer will appear here in a clean readable layout, with sources on the
                  right.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {starters.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="rounded-nx border border-nx-border px-3 py-1.5 text-sm text-nx-muted hover:border-nx-accent hover:text-nx-accent"
                      onClick={() => {
                        setQuery(item);
                        updateUrl(mode, item);
                        void runSearch(item, mode);
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {isBusy && !hasAnswer ? (
              <div className="space-y-3">
                <div className="h-4 w-2/3 animate-pulse rounded bg-nx-border/40" />
                <div className="h-4 w-full animate-pulse rounded bg-nx-border/30" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-nx-border/30" />
                <div className="h-4 w-4/6 animate-pulse rounded bg-nx-border/25" />
              </div>
            ) : null}

            {confidence !== null && hasAnswer ? (
              <div className="mb-6">
                <div className="mb-1 flex justify-between text-xs text-nx-muted">
                  <span>Confidence</span>
                  <span>{confidence}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-nx-border">
                  <div
                    className="h-full bg-nx-accent transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
                  />
                </div>
              </div>
            ) : null}

            {summary ? (
              <div className="rounded-2xl border border-nx-border/70 bg-nx-elevated/50 p-5 sm:p-6">
                <h2 className="font-display text-lg font-semibold text-nx-ink">Summary</h2>
                <p className="mt-3 text-[15px] leading-7 text-nx-ink">
                  {decodeHtmlEntities(summary)}
                </p>
              </div>
            ) : null}

            {detailed ? (
              <div className="mt-6 rounded-2xl border border-nx-border/70 bg-nx-elevated/30 p-5 sm:p-6">
                <AnswerContent markdown={detailed} />
              </div>
            ) : null}

            {related.length > 0 ? (
              <div className="mt-10">
                <h3 className="font-display text-lg font-medium text-nx-ink">Related questions</h3>
                <ul className="mt-3 space-y-2">
                  {related.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        className="text-left text-sm text-nx-accent hover:underline"
                        onClick={() => {
                          setQuery(item);
                          updateUrl(mode, item);
                          void runSearch(item, mode);
                        }}
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {better.length > 0 ? (
              <div className="mt-8">
                <h3 className="font-display text-lg font-medium text-nx-ink">Try these instead</h3>
                <ul className="mt-3 space-y-2">
                  {better.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        className="text-left text-sm text-nx-muted hover:text-nx-accent"
                        onClick={() => {
                          setQuery(item);
                          updateUrl(mode, item);
                          void runSearch(item, mode);
                        }}
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-nx-border/70 bg-nx-elevated/40 p-4 sm:p-5">
              <h2 className="font-display text-lg font-semibold text-nx-ink">Sources</h2>
              <p className="mt-1 text-xs leading-relaxed text-nx-muted">
                Open each source to verify claims. Ranked by relevance, trust, and freshness.
              </p>
              <ul className="mt-4 space-y-4">
                {citations.length === 0 ? (
                  <li className="text-sm leading-relaxed text-nx-muted">
                    {isBusy
                      ? 'Collecting sources…'
                      : mode === 'news'
                        ? 'Search a news topic to see matching sources here.'
                        : mode === 'research'
                          ? 'Run a research question to fill this panel with references.'
                          : 'Sources will appear here after you search.'}
                  </li>
                ) : (
                  citations.map((c) => (
                    <li
                      key={`${c.ordinal}-${c.url}`}
                      className="border-b border-nx-border/80 pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={c.url}
                          target={citationTarget}
                          rel="noreferrer"
                          className="text-sm font-semibold leading-snug text-nx-ink hover:text-nx-accent"
                        >
                          [{c.ordinal}] {c.title}
                        </a>
                        {c.isOfficial ? (
                          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-nx-accent">
                            Trusted
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-xs text-nx-muted">
                        {c.domain} · {trustLabel(c.trustScore)} · {sourceLabel(c.sourceType)}
                      </p>
                      {c.snippet ? (
                        <p className="mt-2 text-sm leading-relaxed text-nx-muted line-clamp-4">
                          {c.snippet}
                        </p>
                      ) : null}
                      <a
                        href={c.url}
                        target={citationTarget}
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-medium text-nx-accent hover:underline"
                      >
                        Read source
                      </a>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

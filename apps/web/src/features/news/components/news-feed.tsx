'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@nexiora/ui';
import { cleanDisplayText, decodeHtmlEntities } from '@nexiora/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string;
  summary?: string | null;
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'technology', label: 'Technology' },
  { id: 'business', label: 'Business' },
  { id: 'science', label: 'Science' },
  { id: 'world', label: 'World' },
] as const;

type NewsFeedProps = {
  limit?: number;
  compact?: boolean;
  showCategoryTabs?: boolean;
};

function formatCategory(value: string): string {
  if (!value) return 'General';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(+date)) return '';
  const diffMs = Date.now() - +date;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function cleanSummary(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = cleanDisplayText(raw);
  if (text.length < 40) return null;
  return text.length > 220 ? `${text.slice(0, 217).trim()}…` : text;
}

export function NewsFeed({
  limit = 20,
  compact = false,
  showCategoryTabs = true,
}: NewsFeedProps) {
  const [category, setCategory] = useState<string>('all');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (category !== 'all') params.set('category', category);
      const res = await fetch(`${API_URL}/v1/news?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Headlines are temporarily unavailable.');
      const body = (await res.json()) as { items: NewsItem[] };
      setItems(body.items ?? []);
      setRefreshedAt(new Date());
    } catch {
      setError('We could not load headlines right now. Please try again in a moment.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      {showCategoryTabs ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="News category">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={category === item.id}
                onClick={() => setCategory(item.id)}
                className={`rounded-nx px-3 py-1.5 text-sm ${
                  category === item.id
                    ? 'bg-nx-accent text-white'
                    : 'border border-nx-border text-nx-muted hover:text-nx-ink'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {refreshedAt ? (
              <span className="text-xs text-nx-muted">
                Updated {refreshedAt.toLocaleTimeString(undefined, { timeStyle: 'short' })}
              </span>
            ) : null}
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-medium text-nx-accent hover:underline"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      )}

      {loading ? (
        <ul className="space-y-3">
          {Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
            <li key={index} className="h-24 animate-pulse rounded-nx bg-nx-border/35" />
          ))}
        </ul>
      ) : null}

      {!loading && error ? (
        <div className="rounded-nx border border-nx-border bg-nx-elevated p-5">
          <p className="text-sm font-medium text-nx-ink">Headlines unavailable</p>
          <p className="mt-1 text-sm leading-relaxed text-nx-muted">{error}</p>
          <Button className="mt-4" variant="secondary" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-nx border border-dashed border-nx-border bg-nx-elevated/60 p-6 text-sm leading-relaxed text-nx-muted">
          No stories in this category yet. Try <span className="font-medium text-nx-ink">All</span> or
          refresh in a moment.
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <ul
          className={
            compact
              ? 'divide-y divide-nx-border overflow-hidden rounded-nx border border-nx-border bg-nx-elevated'
              : 'grid gap-4 sm:grid-cols-2'
          }
        >
          {items.map((item) => {
            const summary = cleanSummary(item.summary);
            return (
              <li
                key={item.id}
                className={
                  compact
                    ? 'px-4 py-4'
                    : 'flex flex-col rounded-nx border border-nx-border bg-nx-elevated p-5 transition hover:border-nx-accent/40'
                }
              >
                <p className="text-xs text-nx-muted">
                  <span className="font-medium text-nx-ink/80">{formatCategory(item.category)}</span>
                  <span className="mx-1.5 text-nx-border">·</span>
                  {item.source}
                  <span className="mx-1.5 text-nx-border">·</span>
                  {formatWhen(item.publishedAt)}
                </p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block font-display text-base font-semibold leading-snug text-nx-ink hover:text-nx-accent"
                >
                  {decodeHtmlEntities(item.title)}
                </a>
                {summary ? (
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-nx-muted">{summary}</p>
                ) : null}
                <div className={`mt-4 flex flex-wrap gap-4 text-sm ${compact ? '' : 'mt-auto'}`}>
                  <Link
                    href={`/search?mode=news&q=${encodeURIComponent(item.title)}`}
                    className="font-medium text-nx-accent hover:underline"
                  >
                    Brief with Nova Search
                  </Link>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-nx-muted hover:text-nx-ink"
                  >
                    Read original
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

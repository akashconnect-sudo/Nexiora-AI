'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nexiora/ui';
import { authHeaders, getSessionUser } from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type HistoryItem = {
  id: string;
  query: string;
  mode?: string;
  status?: string;
  createdAt: string;
};

type BookmarkItem = {
  id: string;
  title?: string;
  url?: string;
  note?: string | null;
  createdAt?: string;
};

export function LibraryHome() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'history' | 'bookmarks'>('history');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getSessionUser()) {
      router.replace('/sign-in?next=/library');
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [histRes, bookRes] = await Promise.all([
          fetch(`${API_URL}/v1/search?limit=40`, {
            headers: { ...authHeaders() },
            cache: 'no-store',
          }),
          fetch(`${API_URL}/v1/bookmarks`, {
            headers: { ...authHeaders() },
            cache: 'no-store',
          }),
        ]);

        if (histRes.ok) {
          const body = (await histRes.json()) as {
            items?: HistoryItem[];
            searches?: HistoryItem[];
          };
          if (!cancelled) setHistory(body.items ?? body.searches ?? []);
        }

        if (bookRes.ok) {
          const body = (await bookRes.json()) as { items?: BookmarkItem[] } | BookmarkItem[];
          const items = Array.isArray(body) ? body : (body.items ?? []);
          if (!cancelled) setBookmarks(items);
        }

        if (!histRes.ok && !bookRes.ok) {
          throw new Error('Could not load library');
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (!ready) {
    return (
      <div className="px-4 py-16 sm:px-8">
        <p className="text-sm text-nx-muted">Loading library…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-nx-accent">Library</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-nx-ink">Your work</h1>
      <p className="mt-2 text-sm text-nx-muted">Recent Nova Searches and bookmarks in one place.</p>

      <div className="mt-6 flex gap-2" role="tablist">
        {(
          [
            { id: 'history', label: `History (${history.length})` },
            { id: 'bookmarks', label: `Bookmarks (${bookmarks.length})` },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-nx px-3 py-1.5 text-sm ${
              tab === item.id
                ? 'bg-nx-accent text-white'
                : 'border border-nx-border text-nx-muted hover:text-nx-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <p className="mt-8 text-sm text-nx-muted">Loading…</p> : null}
      {error ? (
        <p className="mt-8 rounded-nx border border-nx-border bg-nx-elevated p-4 text-sm text-nx-muted">
          {error}
        </p>
      ) : null}

      {!loading && tab === 'history' ? (
        history.length === 0 ? (
          <div className="mt-8 rounded-nx border border-dashed border-nx-border p-8 text-center">
            <p className="text-sm text-nx-muted">No searches yet.</p>
            <Link href="/search" className="mt-4 inline-block">
              <Button>Start a search</Button>
            </Link>
          </div>
        ) : (
          <ul className="mt-6 overflow-hidden rounded-nx border border-nx-border bg-nx-elevated">
            {history.map((item) => (
              <li key={item.id} className="border-b border-nx-border last:border-0">
                <Link
                  href={`/search?q=${encodeURIComponent(item.query)}${item.mode ? `&mode=${item.mode}` : ''}`}
                  className="block px-4 py-3.5 hover:bg-nx-accent-soft/40"
                >
                  <p className="font-medium text-nx-ink">{item.query}</p>
                  <p className="mt-1 text-xs text-nx-muted">
                    {item.mode ?? 'universal'}
                    {item.status ? ` · ${item.status}` : ''} ·{' '}
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {!loading && tab === 'bookmarks' ? (
        bookmarks.length === 0 ? (
          <div className="mt-8 rounded-nx border border-dashed border-nx-border p-8 text-center">
            <p className="text-sm text-nx-muted">
              No bookmarks yet. Save sources from search results once bookmarking is wired in the
              answer rail.
            </p>
            <Link href="/search" className="mt-4 inline-block">
              <Button variant="secondary">Go to search</Button>
            </Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {bookmarks.map((item) => (
              <li key={item.id} className="rounded-nx border border-nx-border bg-nx-elevated p-4">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-nx-ink hover:text-nx-accent"
                >
                  {item.title || item.url}
                </a>
                {item.note ? <p className="mt-2 text-sm text-nx-muted">{item.note}</p> : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

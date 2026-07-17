'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@nexiora/ui';
import { NewsFeed } from '@/features/news/components/news-feed';
import { authHeaders, getSessionUser, type SessionUser } from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const STARTERS = [
  { label: 'AI policy this week', q: 'AI regulation policy news this week', mode: 'news' },
  { label: 'Markets today', q: 'global stock markets today', mode: 'news' },
  { label: 'Transformer survey', q: 'transformer architecture survey', mode: 'research' },
  { label: 'Cyber incidents', q: 'latest cybersecurity incidents', mode: 'news' },
] as const;

type HistoryItem = {
  id: string;
  query: string;
  mode?: string;
  status?: string;
  createdAt: string;
};

export function DashboardHome() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyNote, setHistoryNote] = useState<string | null>(null);

  useEffect(() => {
    const session = getSessionUser();
    if (!session) {
      router.replace('/sign-in?next=/dashboard');
      return;
    }
    setUser(session);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function loadHistory() {
      try {
        const res = await fetch(`${API_URL}/v1/search?limit=6`, {
          headers: { ...authHeaders() },
          cache: 'no-store',
        });
        if (!res.ok) {
          if (!cancelled) setHistoryNote('Sign in again if recent searches do not appear.');
          return;
        }
        const body = (await res.json()) as { items?: HistoryItem[]; searches?: HistoryItem[] };
        const items = body.items ?? body.searches ?? (Array.isArray(body) ? body : []);
        if (!cancelled) {
          setHistory(items.slice(0, 6));
          if (items.length === 0) {
            setHistoryNote('No searches yet — try a starter topic below.');
          }
        }
      } catch {
        if (!cancelled)
          setHistoryNote('Recent searches are unavailable right now. Try again shortly.');
      }
    }
    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?mode=universal&q=${encodeURIComponent(trimmed)}`);
  }

  if (!user) {
    return (
      <div className="px-4 py-16 sm:px-8">
        <p className="text-sm text-nx-muted">Opening your workspace…</p>
      </div>
    );
  }

  const name = user.displayName || user.email.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-nx-accent">Home</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-nx-ink">
            {hello}, {name}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-nx-muted">
            Live headlines on the right. Search anything below — every answer ships with citations
            you can open and check.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/news">
            <Button variant="secondary">Browse news</Button>
          </Link>
          <Link href="/search">
            <Button>Open search</Button>
          </Link>
        </div>
      </div>

      <form
        onSubmit={onSearch}
        className="mt-8 flex flex-col gap-3 rounded-nx border border-nx-border bg-nx-elevated p-3 shadow-sm sm:flex-row sm:items-center"
        role="search"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask Nova Search — e.g. what changed in AI regulation this week?"
          className="h-11 w-full flex-1 rounded-nx border-0 bg-transparent px-3 text-base outline-none ring-0 placeholder:text-nx-muted"
        />
        <Button type="submit" className="h-11 w-full px-6 sm:w-auto">
          Search
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {STARTERS.map((item) => (
          <Link
            key={item.label}
            href={`/search?mode=${item.mode}&q=${encodeURIComponent(item.q)}`}
            className="rounded-nx border border-nx-border bg-nx-elevated px-3 py-1.5 text-sm text-nx-muted transition hover:border-nx-accent hover:text-nx-accent"
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-nx-ink">Live news</h2>
            <Link href="/news" className="text-sm font-medium text-nx-accent hover:underline">
              View all
            </Link>
          </div>
          <NewsFeed limit={8} showCategoryTabs={false} compact />
        </section>

        <div className="space-y-8">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-nx-ink">Recent searches</h2>
              <Link href="/library" className="text-sm font-medium text-nx-accent hover:underline">
                Library
              </Link>
            </div>
            {history.length === 0 ? (
              <div className="rounded-nx border border-dashed border-nx-border bg-nx-elevated/50 p-5 text-sm text-nx-muted">
                {historyNote ?? 'Loading recent searches…'}
              </div>
            ) : (
              <ul className="overflow-hidden rounded-nx border border-nx-border bg-nx-elevated">
                {history.map((item) => (
                  <li key={item.id} className="border-b border-nx-border last:border-0">
                    <Link
                      href={`/search?q=${encodeURIComponent(item.query)}${item.mode ? `&mode=${item.mode}` : ''}`}
                      className="block px-4 py-3 hover:bg-nx-accent-soft/40"
                    >
                      <p className="line-clamp-1 text-sm font-medium text-nx-ink">{item.query}</p>
                      <p className="mt-1 text-xs text-nx-muted">
                        {item.mode ?? 'universal'} ·{' '}
                        {new Date(item.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-nx border border-nx-border bg-nx-elevated p-5">
            <h2 className="font-display text-lg font-semibold text-nx-ink">Where things live</h2>
            <ul className="mt-4 space-y-3 text-sm text-nx-muted">
              <li>
                <span className="font-medium text-nx-ink">Search</span> — ask anything, get cited
                answers
              </li>
              <li>
                <span className="font-medium text-nx-ink">News</span> — live headlines; synthesize
                any story
              </li>
              <li>
                <span className="font-medium text-nx-ink">Library</span> — your history and
                bookmarks
              </li>
              <li>
                <span className="font-medium text-nx-ink">Settings</span> — theme, account, defaults
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

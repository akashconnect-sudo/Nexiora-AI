'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@nexiora/ui';

/**
 * Functional landing omnibox — routes into the search experience.
 * Full Nova Search pipeline arrives in Phase 1.
 */
export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-10 flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
      role="search"
    >
      <label className="sr-only" htmlFor="hero-search">
        Search with Nova Search
      </label>
      <input
        id="hero-search"
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask a question — answers come with sources"
        className="h-12 flex-1 rounded-nx border border-nx-border bg-nx-elevated px-4 text-base text-nx-ink shadow-none outline-none ring-nx-accent transition focus:ring-2"
        autoComplete="off"
      />
      <Button type="submit" className="h-12 px-6">
        Search
      </Button>
    </form>
  );
}

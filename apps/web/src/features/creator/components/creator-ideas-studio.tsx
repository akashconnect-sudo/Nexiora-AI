'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@nexiora/ui';
import { creatorFetch } from '@/lib/creator-api';
import { getSessionUser } from '@/lib/session';

type IdeaPack = {
  topic: string;
  why: string;
  disclaimer: string;
  videoTitles: string[];
  thumbnailIdeas: string[];
  hooks: string[];
  scriptOutline: string[];
  seoKeywords: string[];
  description: string;
  tags: string[];
  hashtags: string[];
  shortsIdeas: string[];
  longformIdeas: string[];
  podcastIdeas: string[];
  communityPosts: string[];
  tweets: string[];
  linkedInPosts: string[];
  instagramReels: string[];
  facebookPosts: string[];
  blogArticles: string[];
  newsletterIdeas: string[];
};

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  const unique = Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
  return (
    <section className="rounded-2xl border border-nx-border/70 bg-nx-elevated/40 p-5">
      <h2 className="font-display text-base font-semibold text-nx-ink">{title}</h2>
      <ul className="mt-3 space-y-2.5">
        {unique.map((item, index) => (
          <li key={`${title}-${index}`} className="text-sm leading-relaxed text-nx-muted">
            <span className="mr-2 text-nx-accent">•</span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CreatorIdeasStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState(searchParams.get('topic') ?? '');
  const [pack, setPack] = useState<IdeaPack | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSessionUser()) router.replace('/sign-in?next=/creator/ideas');
  }, [router]);

  useEffect(() => {
    const initial = searchParams.get('topic');
    if (initial) {
      setTopic(initial);
      void run(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const result = await creatorFetch<IdeaPack>('/ideas', {
        method: 'POST',
        body: JSON.stringify({ topic: trimmed, format: 'multi' }),
      });
      setPack(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run(topic);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <h1 className="font-display text-3xl font-semibold text-nx-ink">Idea studio</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-nx-muted">
        Draft video titles, openings, keywords, Shorts, and social posts for one topic — each pack
        includes a short reason it was suggested.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic — e.g. Amazon Connect"
          className="h-12 flex-1 rounded-nx border border-nx-border bg-nx-elevated px-4 outline-none focus:ring-2 focus:ring-nx-accent"
        />
        <Button type="submit" disabled={busy} className="h-12 px-6">
          {busy ? 'Creating…' : 'Create ideas'}
        </Button>
      </form>
      {error ? <p className="mt-3 text-sm text-nx-danger">{error}</p> : null}

      {pack ? (
        <div className="mt-8 space-y-4">
          <div className="creator-glass rounded-2xl border border-nx-border/70 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-nx-accent">Suggested pack</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-nx-ink">{pack.topic}</h2>
            <p className="mt-3 text-sm leading-relaxed text-nx-ink">{pack.why}</p>
            <p className="mt-2 text-xs leading-relaxed text-nx-muted">{pack.disclaimer}</p>
            <p className="mt-4 text-sm leading-relaxed text-nx-muted">{pack.description}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Video titles" items={pack.videoTitles} />
            <Section title="Openings" items={pack.hooks} />
            <Section title="Thumbnail ideas" items={pack.thumbnailIdeas} />
            <Section title="Script outline" items={pack.scriptOutline} />
            <Section title="Search keywords" items={pack.seoKeywords} />
            <Section title="Tags" items={pack.tags} />
            <Section title="Hashtags" items={pack.hashtags} />
            <Section title="Shorts" items={pack.shortsIdeas} />
            <Section title="Long videos" items={pack.longformIdeas} />
            <Section title="Podcast" items={pack.podcastIdeas} />
            <Section title="Community posts" items={pack.communityPosts} />
            <Section title="X / Twitter" items={pack.tweets} />
            <Section title="LinkedIn" items={pack.linkedInPosts} />
            <Section title="Instagram Reels" items={pack.instagramReels} />
            <Section title="Facebook" items={pack.facebookPosts} />
            <Section title="Blog" items={pack.blogArticles} />
            <Section title="Newsletter" items={pack.newsletterIdeas} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

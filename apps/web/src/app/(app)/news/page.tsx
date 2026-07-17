import { NewsFeed } from '@/features/news/components/news-feed';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'News | live headlines — Nexiora AI',
  description:
    'Browse live technology and world headlines, then turn any story into a cited Nova Search briefing.',
  path: '/news',
  keywords: ['AI news search', 'live news synthesis', 'Nova Search news'],
  noIndex: true,
});

export default function NewsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-nx-accent">News</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-nx-ink">Live headlines</h1>
        <p className="mt-2 text-sm leading-relaxed text-nx-muted">
          Fresh stories, clearly written. Open any article, or ask Nova Search for a short briefing
          with sources.
        </p>
      </div>
      <div className="mt-8">
        <NewsFeed limit={24} />
      </div>
    </div>
  );
}

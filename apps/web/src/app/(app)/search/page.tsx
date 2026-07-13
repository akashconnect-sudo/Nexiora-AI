import { SearchExperience } from '@/features/search/components/search-experience';
import { buildMetadata } from '@/lib/seo';

type SearchPageProps = {
  searchParams: Promise<{ q?: string; mode?: string }>;
};

export const metadata = buildMetadata({
  title: 'Nova Search | ask questions and verify citations — Nexiora AI',
  description:
    'Run a Nova Search query with streaming answers, confidence scores, and a citation rail ranked by trust and freshness.',
  path: '/search',
  keywords: ['Nova Search', 'AI search tool', 'cited answers', 'verify sources online'],
});

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';
  const mode = params.mode?.trim() || undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
      <div className="mb-2">
        <h1 className="font-display text-2xl font-semibold text-nx-ink">Nova Search</h1>
        <p className="mt-1 text-sm text-nx-muted">
          Pick a mode, ask a question, and check every claim in Sources.
        </p>
      </div>
      <SearchExperience initialQuery={query} initialMode={mode} />
    </div>
  );
}

import Link from 'next/link';
import { Button } from '@nexiora/ui';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Research mode | academic-first AI search — Nexiora',
  description:
    'Use Nova Search research mode to prioritize academic and documentation sources, then inspect citations before you cite them yourself.',
  path: '/research',
  keywords: ['academic AI search', 'research mode', 'cited literature search', 'Nova Search research'],
});

export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-display text-4xl font-semibold text-nx-ink">Research mode</h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-nx-muted">
        Research mode tilts retrieval and ranking toward scholarly works, standards documents, and
        high-trust reference pages. It does not replace a librarian—or your judgment—but it shortens
        the path from question to inspectable sources.
      </p>
      <ul className="mt-10 max-w-2xl list-disc space-y-3 pl-5 text-sm text-nx-muted">
        <li>Academic adapters contribute paper-level results when available.</li>
        <li>Trust weighting favors official and peer-linked domains.</li>
        <li>Every answer still exposes URLs, snippets, and confidence.</li>
      </ul>
      <div className="mt-10">
        <Link href="/search?mode=research&q=transformer%20architecture%20survey">
          <Button>Try a research query</Button>
        </Link>
      </div>
    </div>
  );
}

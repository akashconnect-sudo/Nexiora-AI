import Link from 'next/link';
import { Button } from '@nexiora/ui';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'How Nova Search works | Nexiora AI retrieval and ranking',
  description:
    'Learn how Nova Search classifies intent, retrieves multiple sources, ranks by trust and freshness, and streams cited answers.',
  path: '/how-it-works',
});

const steps = [
  {
    title: 'You ask in plain language',
    body: 'Type a question the way you would ask a colleague. Optional filters narrow country, language, date range, and source types before retrieval starts.',
  },
  {
    title: 'Adapters fetch in parallel',
    body: 'Nexiora calls independent source adapters (encyclopedic, academic, discussion, and more as they come online). If one provider fails, the others continue.',
  },
  {
    title: 'Duplicates drop; trust rises',
    body: 'Near-identical URLs collapse. Remaining documents receive a hybrid score for relevance, domain trust, official status, and publication age.',
  },
  {
    title: 'Answer streams with citations',
    body: 'You see a summary and a longer write-up while the citation rail fills. Confidence reflects source agreement and coverage—not marketing theatre.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-display text-4xl font-semibold text-nx-ink">How Nova Search works</h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-nx-muted">
        Nova Search is a pipeline, not a single model call. Understanding the steps helps you judge
        when to trust an answer and when to open the primary documents.
      </p>
      <ol className="mt-12 space-y-10">
        {steps.map((step, index) => (
          <li key={step.title} className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-wider text-nx-accent">
              {String(index + 1).padStart(2, '0')}
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-nx-ink">{step.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-nx-muted">{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-12">
        <Link href="/search">
          <Button>Run a search</Button>
        </Link>
      </div>
    </div>
  );
}

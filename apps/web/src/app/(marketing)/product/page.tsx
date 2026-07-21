import Link from 'next/link';
import { Button } from '@nexiora/ui';
import { HeroSearch } from '@/components/hero-search';
import { homeCopy } from '@/content/site';
import { buildMetadata, faqJsonLd } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Nexiora AI | Nova Search — AI search with citations you can verify',
  description:
    'Nova Search retrieves multiple sources, ranks them by trust and freshness, and returns cited answers with confidence scores.',
  path: '/product',
  keywords: ['AI search with citations', 'Nova Search', 'verified AI answers'],
});

export default function ProductPage() {
  const { sections } = homeCopy;

  return (
    <div className="nx-atmosphere">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(sections.faq.items)) }}
      />

      <section className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-6xl flex-col justify-center px-4 py-16">
        <p className="font-display text-sm font-medium uppercase tracking-[0.2em] text-nx-accent">
          {homeCopy.brandEyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-5xl font-semibold tracking-tight text-nx-ink sm:text-6xl">
          {homeCopy.h1}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-nx-muted">{homeCopy.lead}</p>
        <HeroSearch />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/sign-up">
            <Button>{homeCopy.primaryCta}</Button>
          </Link>
          <Link href="/pricing">
            <Button variant="secondary">{homeCopy.secondaryCta}</Button>
          </Link>
        </div>
      </section>

      <section className="border-t border-nx-border bg-nx-elevated/70 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-semibold text-nx-ink">{sections.problem.h2}</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-nx-muted">
            {sections.problem.body}
          </p>
        </div>
      </section>

      <section className="border-t border-nx-border py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-semibold text-nx-ink">{sections.how.h2}</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {sections.how.steps.map((step, index) => (
              <li key={step.title}>
                <p className="text-xs font-medium uppercase tracking-wider text-nx-accent">
                  Step {index + 1}
                </p>
                <h3 className="mt-2 font-display text-xl font-medium text-nx-ink">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-nx-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-nx-border bg-nx-elevated/50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-semibold text-nx-ink">
            {sections.audiences.h2}
          </h2>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {sections.audiences.items.map((item) => (
              <li key={item.title}>
                <h3 className="font-display text-lg font-medium text-nx-ink">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-nx-muted">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-nx-border py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl font-semibold text-nx-ink">{sections.faq.h2}</h2>
          <dl className="mt-10 max-w-3xl space-y-8">
            {sections.faq.items.map((item) => (
              <div key={item.q}>
                <dt className="font-display text-lg font-medium text-nx-ink">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-nx-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}

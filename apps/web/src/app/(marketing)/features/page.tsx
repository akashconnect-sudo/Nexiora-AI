import Link from 'next/link';
import { Button } from '@nexiora/ui';
import { featuresCopy } from '@/content/site';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Nova Search features | citation-first AI search by Nexiora',
  description: featuresCopy.description,
  path: '/features',
});

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-display text-4xl font-semibold text-nx-ink">{featuresCopy.title}</h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-nx-muted">{featuresCopy.intro}</p>
      <div className="mt-8">
        <Link href="/search">
          <Button>Open Nova Search</Button>
        </Link>
      </div>
      <div className="mt-14 space-y-14">
        {featuresCopy.groups.map((group) => (
          <section key={group.id} id={group.id}>
            <h2 className="font-display text-2xl font-semibold text-nx-ink">{group.h2}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-nx-muted">{group.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

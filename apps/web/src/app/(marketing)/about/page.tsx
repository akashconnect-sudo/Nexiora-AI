import { aboutCopy } from '@/content/site';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'About Nexiora AI | builders of Nova Search',
  description: aboutCopy.description,
  path: '/about',
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-semibold text-nx-ink">{aboutCopy.title}</h1>
      <div className="mt-8 space-y-5">
        {aboutCopy.body.map((paragraph) => (
          <p key={paragraph.slice(0, 32)} className="text-base leading-relaxed text-nx-muted">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

import { Suspense } from 'react';
import { CreatorIdeasStudio } from '@/features/creator/components/creator-ideas-studio';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Idea studio — Creator Intelligence',
  description: 'Generate titles, hooks, SEO, Shorts, and multi-platform content packs.',
  path: '/creator/ideas',
  noIndex: true,
});

export default function CreatorIdeasPage() {
  return (
    <Suspense fallback={<p className="px-8 py-10 text-sm text-nx-muted">Loading idea studio…</p>}>
      <CreatorIdeasStudio />
    </Suspense>
  );
}

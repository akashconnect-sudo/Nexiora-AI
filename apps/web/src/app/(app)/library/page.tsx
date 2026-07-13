import { LibraryHome } from '@/features/library/components/library-home';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Library — Nexiora AI',
  description: 'Your Nova Search history and bookmarks.',
  path: '/library',
  noIndex: true,
});

export default function LibraryPage() {
  return <LibraryHome />;
}

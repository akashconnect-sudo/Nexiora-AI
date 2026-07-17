import { CreatorDnaView } from '@/features/creator/components/creator-dna-view';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Creator DNA — Nexiora AI',
  description: 'Your creator profile snapshot — topics, style, and channel signals.',
  path: '/creator/dna',
  noIndex: true,
});

export default function Page() {
  return <CreatorDnaView />;
}

import { CreatorTrends } from '@/features/creator/components/creator-trends';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Trends — Creator Intelligence',
  description: 'Live public headlines and trend scores for your creator niche.',
  path: '/creator/trends',
  noIndex: true,
});

export default function Page() {
  return <CreatorTrends />;
}

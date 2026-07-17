import { CreatorOpportunities } from '@/features/creator/components/creator-opportunities';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Opportunities — Creator Intelligence',
  description: 'Ranked content opportunities with scores and reasons to film next.',
  path: '/creator/opportunities',
  noIndex: true,
});

export default function Page() {
  return <CreatorOpportunities />;
}

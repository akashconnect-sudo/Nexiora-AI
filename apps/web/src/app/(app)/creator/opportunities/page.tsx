import { CreatorOpportunities } from '@/features/creator/components/creator-opportunities';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Opportunities — Creator Intelligence',
  path: '/creator/opportunities',
  noIndex: true,
});

export default function Page() {
  return <CreatorOpportunities />;
}

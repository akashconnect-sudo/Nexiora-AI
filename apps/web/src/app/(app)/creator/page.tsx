import { CreatorDashboard } from '@/features/creator/components/creator-dashboard';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Creator Intelligence — Nexiora AI',
  description:
    'Personalized YouTube content opportunities with opportunity scores, trend signals, and AI coach tips.',
  path: '/creator',
  noIndex: true,
});

export default function CreatorPage() {
  return <CreatorDashboard />;
}

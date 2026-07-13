import { CreatorOnboarding } from '@/features/creator/components/creator-onboarding';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Creator onboarding — Nexiora AI',
  description: 'Create your Creator Profile and grant permissions explicitly.',
  path: '/creator/onboarding',
  noIndex: true,
});

export default function CreatorOnboardingPage() {
  return <CreatorOnboarding />;
}

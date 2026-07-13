import { CreatorCoach } from '@/features/creator/components/creator-coach';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'AI Coach — Creator Intelligence',
  path: '/creator/coach',
  noIndex: true,
});

export default function Page() {
  return <CreatorCoach />;
}

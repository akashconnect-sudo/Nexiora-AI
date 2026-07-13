import { DashboardHome } from '@/features/dashboard/components/dashboard-home';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Dashboard | live news and Nova Search — Nexiora AI',
  description:
    'Your Nexiora dashboard with live headlines, starter topics, and one-click Nova Search.',
  path: '/dashboard',
  noIndex: true,
});

export default function DashboardPage() {
  return <DashboardHome />;
}

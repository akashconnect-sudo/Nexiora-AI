import { SettingsPanel } from '@/features/settings/components/settings-panel';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Settings — Nexiora AI',
  description: 'Account, theme, and Nova Search preferences.',
  path: '/settings',
  noIndex: true,
});

export default function SettingsPage() {
  return <SettingsPanel />;
}

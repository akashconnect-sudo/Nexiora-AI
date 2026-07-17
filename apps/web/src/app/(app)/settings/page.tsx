import { Suspense } from 'react';
import { SettingsExperience } from '@/features/settings/components/settings-experience';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Settings — Nexiora AI',
  description: 'Account, theme, and Nova Search preferences.',
  path: '/settings',
  noIndex: true,
});

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-nx-muted">Loading settings…</div>}>
      <SettingsExperience />
    </Suspense>
  );
}

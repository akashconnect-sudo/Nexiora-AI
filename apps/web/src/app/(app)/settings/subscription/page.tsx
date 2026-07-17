import { Suspense } from 'react';
import { SettingsExperience } from '@/features/settings/components/settings-experience';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Billing & payments — Nexiora AI',
  description: 'Manage your Nexiora AI plan, payment method, and invoices.',
  path: '/settings/subscription',
  noIndex: true,
});

export default function SubscriptionSettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-nx-muted">Loading billing…</div>}>
      <SettingsExperience initialSection="billing" />
    </Suspense>
  );
}

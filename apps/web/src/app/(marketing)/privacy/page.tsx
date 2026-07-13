import { buildMetadata } from '@/lib/seo';
import { siteConfig } from '@/content/site';

export const metadata = buildMetadata({
  title: 'Privacy Policy | Nexiora AI',
  description: 'How Nexiora AI collects, uses, and retains data for Nova Search and related services.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 prose-nx">
      <h1 className="font-display text-4xl font-semibold text-nx-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-nx-muted">Last updated: 11 July 2026</p>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-nx-muted">
        <p>
          This policy describes how {siteConfig.name} (“we”) handles information when you use Nova
          Search and related websites or APIs.
        </p>
        <h2 className="font-display text-xl font-semibold text-nx-ink">What we collect</h2>
        <p>
          Account data (email, display name, auth provider identifiers), search queries and result
          metadata when history is enabled, usage metrics for billing and abuse prevention, and
          standard server logs (hashed IP, user agent). Payment card data is handled by our payment
          processor; we do not store full card numbers.
        </p>
        <h2 className="font-display text-xl font-semibold text-nx-ink">How we use data</h2>
        <p>
          To provide search, personalization of history and bookmarks, enforce plan limits, secure
          the service, and improve ranking quality. We do not sell personal information.
        </p>
        <h2 className="font-display text-xl font-semibold text-nx-ink">Retention and deletion</h2>
        <p>
          You may export or delete account data from settings once authenticated features are
          enabled. Deleted accounts enter a short retention window for backup integrity, then
          personal records are purged except where law requires otherwise.
        </p>
        <h2 className="font-display text-xl font-semibold text-nx-ink">Contact</h2>
        <p>
          Privacy questions: <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>
        </p>
      </div>
    </article>
  );
}

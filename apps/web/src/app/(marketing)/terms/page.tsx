import { buildMetadata } from '@/lib/seo';
import { siteConfig } from '@/content/site';

export const metadata = buildMetadata({
  title: 'Terms of Service | Nexiora AI',
  description: 'Terms governing use of Nexiora AI websites, Nova Search, and related APIs.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-semibold text-nx-ink">Terms of Service</h1>
      <p className="mt-2 text-sm text-nx-muted">Last updated: 11 July 2026</p>
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-nx-muted">
        <p>
          By using {siteConfig.name} services, including Nova Search, you agree to these terms. If
          you use the product on behalf of an organization, you represent that you have authority to
          bind that organization.
        </p>
        <h2 className="font-display text-xl font-semibold text-nx-ink">Acceptable use</h2>
        <p>
          Do not abuse rate limits, attempt unauthorized access, scrape the service in violation of
          these terms, or use outputs to break applicable law. Automated access requires an API key
          and compliance with published quotas.
        </p>
        <h2 className="font-display text-xl font-semibold text-nx-ink">No professional advice</h2>
        <p>
          Answers may be incomplete or incorrect. Nova Search is not a substitute for licensed legal,
          medical, financial, or other professional advice. Always verify critical claims against
          primary sources shown in citations.
        </p>
        <h2 className="font-display text-xl font-semibold text-nx-ink">Accounts and billing</h2>
        <p>
          You are responsible for activity under your account. Paid plans renew until cancelled.
          Fees already charged for a billing period are generally non-refundable except where
          required by law.
        </p>
        <h2 className="font-display text-xl font-semibold text-nx-ink">Contact</h2>
        <p>
          Legal notices: <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a>
        </p>
      </div>
    </article>
  );
}

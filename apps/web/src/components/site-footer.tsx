import Link from 'next/link';
import { footerColumns, siteConfig } from '@/content/site';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-nx-border bg-nx-elevated/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-semibold text-nx-ink">{siteConfig.name}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-nx-muted">
            {siteConfig.product} helps you verify answers with ranked sources, confidence scores, and
            clear timestamps.
          </p>
        </div>
        {footerColumns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-medium text-nx-ink">{column.title}</p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-nx-muted hover:text-nx-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-nx-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-nx-muted sm:flex-row sm:justify-between">
          <span>
            © {year} {siteConfig.name}. All rights reserved.
          </span>
          <span>
            <Link href="/privacy" className="hover:text-nx-accent">
              Privacy
            </Link>
            {' · '}
            <Link href="/terms" className="hover:text-nx-accent">
              Terms
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

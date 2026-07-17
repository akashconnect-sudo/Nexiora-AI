import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { defaultSeo, siteConfig } from '@/content/site';
import { buildMetadata, organizationJsonLd, softwareJsonLd } from '@/lib/seo';
import '@nexiora/ui/styles.css';
import './globals.css';

export const metadata: Metadata = {
  ...buildMetadata({
    title: defaultSeo.title,
    description: defaultSeo.description,
    path: '/',
  }),
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  manifest: '/manifest.webmanifest',
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
};

export { viewport } from './viewport';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@500,600,700&f[]=general-sans@400,500,600&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd()) }}
        />
      </head>
      <body className="min-h-screen bg-nx-bg font-body text-nx-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

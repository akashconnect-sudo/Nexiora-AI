import type { Metadata } from 'next';
import { defaultSeo, siteConfig } from '@/content/site';

const siteUrl = siteConfig.url;

export function buildMetadata(input: {
  title: string;
  description: string;
  path?: string;
  keywords?: readonly string[];
  noIndex?: boolean;
}): Metadata {
  const url = input.path ? `${siteUrl}${input.path}` : siteUrl;
  const keywords = [...(input.keywords ?? defaultSeo.keywords)];

  return {
    title: input.title,
    description: input.description,
    keywords: keywords as string[],
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      locale: siteConfig.locale,
      url,
      siteName: siteConfig.name,
      title: input.title,
      description: input.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      site: siteConfig.twitter,
    },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteUrl,
    email: siteConfig.supportEmail,
    sameAs: [],
  };
}

export function softwareJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${siteConfig.product} by ${siteConfig.name}`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: defaultSeo.description,
    url: siteUrl,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

export function faqJsonLd(items: readonly { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

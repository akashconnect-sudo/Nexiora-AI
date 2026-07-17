import { siteConfig } from '@/content/site';

export default function sitemap() {
  const base = siteConfig.url;
  const paths = [
    '',
    '/features',
    '/how-it-works',
    '/pricing',
    '/about',
    '/research',
    '/privacy',
    '/terms',
  ];

  const lastModified = new Date();

  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: path === '' ? ('daily' as const) : ('weekly' as const),
    priority: path === '' ? 1 : path === '/pricing' ? 0.9 : 0.7,
  }));
}

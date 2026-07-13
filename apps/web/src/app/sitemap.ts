import { siteConfig } from '@/content/site';

export default function sitemap() {
  const base = siteConfig.url;
  const paths = [
    '',
    '/features',
    '/how-it-works',
    '/pricing',
    '/about',
    '/news',
    '/research',
    '/search',
    '/privacy',
    '/terms',
  ];

  const lastModified = new Date();

  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: path === '' || path === '/news' ? ('daily' as const) : ('weekly' as const),
    priority: path === '' ? 1 : path === '/search' || path === '/pricing' ? 0.9 : 0.7,
  }));
}

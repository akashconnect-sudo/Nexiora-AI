import type { MetadataRoute } from 'next';
import { siteConfig } from '@/content/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/sign-in',
        '/sign-up',
        '/dashboard',
        '/creator',
        '/search',
        '/news',
        '/library',
        '/settings',
        '/api/',
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}

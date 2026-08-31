import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // '/booking/lookup' is a public utility page under the otherwise
      // private '/booking/[id]' prefix — the more specific `allow` wins
      // over the shorter `disallow` per the robots.txt spec.
      allow: ['/', '/booking/lookup'],
      disallow: ['/admin', '/api', '/booking/', '/pay/'],
    },
    sitemap: new URL('/sitemap.xml', siteConfig.siteUrl).toString(),
  };
}

import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/config';

/**
 * Only genuinely public, indexable pages belong here. Deliberately
 * excluded: /admin/* (private), /booking/[id] and /pay/* (guest-specific,
 * token/id-addressed — not content anyone should land on from search),
 * and every /api/* route.
 */
const PUBLIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/accommodation', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/gallery', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/book', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/policies', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/booking/lookup', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy-request', changeFrequency: 'yearly', priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: new URL(route.path, siteConfig.siteUrl).toString(),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/config';
import { listPublishedPosts } from '@/lib/blog/store';

/**
 * Only genuinely public, indexable pages belong here. Deliberately
 * excluded: /admin/* (private), /booking/[id] and /pay/* (guest-specific,
 * token/id-addressed — not content anyone should land on from search),
 * /search (noindex — see its own metadata), and every /api/* route.
 */
const PUBLIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/accommodation', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/gallery', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/area-guide', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/blog', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/book', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/faq', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/policies', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/booking/lookup', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy-request', changeFrequency: 'yearly', priority: 0.2 },
];

// Reads live blog posts from the database on every request — must not be
// statically generated at build time (there's no DB connection available
// then, e.g. in CI). Also means a newly published post appears here
// immediately, with no manual sitemap maintenance.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries = PUBLIC_ROUTES.map((route) => ({
    url: new URL(route.path, siteConfig.siteUrl).toString(),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Fails open (an empty list) rather than taking down the whole sitemap —
  // the static pages above are far more important than blog posts being
  // in it a moment sooner.
  let postEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await listPublishedPosts({ limit: 500 });
    postEntries = posts.map((post) => ({
      url: new URL(`/blog/${post.slug}`, siteConfig.siteUrl).toString(),
      lastModified: new Date(post.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));
  } catch (err) {
    console.warn('Failed to load blog posts for sitemap:', err);
  }

  return [...staticEntries, ...postEntries];
}

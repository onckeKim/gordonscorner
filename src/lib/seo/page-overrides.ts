import 'server-only';
import type { Metadata } from 'next';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/**
 * Lets an admin override a page's title/description/canonical/OG image/
 * noindex from /admin/seo without a redeploy, layered over the coded
 * defaults every page already ships with. Never throws — a database
 * hiccup here must fall back to the coded defaults, not break the page.
 */
export interface PageSeoDefaults {
  /** Site-relative path this page is served at, e.g. '/accommodation' — also the page_seo_overrides lookup key. */
  path: string;
  /** Short title (the root layout's title template adds " — Gordon's Corner"). */
  title: string;
  description: string;
}

export async function resolvePageSeo(defaults: PageSeoDefaults): Promise<Metadata> {
  let override: { title: string | null; description: string | null; canonical_path: string | null; og_image_url: string | null; noindex: boolean } | null = null;

  try {
    const db = createAdminSupabaseClient();
    const { data } = await db.from('page_seo_overrides').select('*').eq('path', defaults.path).maybeSingle();
    override = data;
  } catch {
    // Fall through to defaults — SEO metadata must never break a page render.
  }

  const title = override?.title || defaults.title;
  const description = override?.description || defaults.description;
  const canonicalPath = override?.canonical_path || defaults.path;
  const ogImage = override?.og_image_url || undefined;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    ...(override?.noindex ? { robots: { index: false, follow: false } } : {}),
    openGraph: { title, description, ...(ogImage ? { images: [{ url: ogImage }] } : {}) },
    twitter: { title, description, ...(ogImage ? { images: [ogImage] } : {}) },
  };
}

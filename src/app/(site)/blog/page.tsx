import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { siteConfig } from '@/lib/config';
import { listPublishedPosts, listCategoriesAndTags } from '@/lib/blog/store';
import { excerptFromContent } from '@/lib/blog/render';
import { resolvePageSeo } from '@/lib/seo/page-overrides';

export async function generateMetadata(): Promise<Metadata> {
  return resolvePageSeo({
    path: '/blog',
    title: 'Blog',
    description: `Local attractions, travel guides, and things to do near ${siteConfig.propertyName} in ${siteConfig.address}.`,
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string }>;
}) {
  const { category, tag } = await searchParams;
  const [posts, { categories, tags }] = await Promise.all([
    listPublishedPosts({ category, tag, limit: 30 }),
    listCategoriesAndTags(),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ name: 'Blog', path: '/blog' }]} />

      <section className="border-b border-corner-stone">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="eyebrow">Blog</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-corner-charcoal sm:text-5xl">
            Local guides & travel notes
          </h1>
          <p className="mx-auto mt-4 max-w-md text-corner-muted">
            Attractions, seasonal tips, and things to do near {siteConfig.propertyName}.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-16">
          {(categories.length > 0 || tags.length > 0) && (
            <div className="mb-10 flex flex-wrap gap-2">
              <Link href="/blog" className={`rounded-full px-4 py-1.5 text-xs font-medium ${!category && !tag ? 'bg-corner-ink text-white' : 'border border-corner-border bg-white text-corner-ink hover:bg-corner-bg'}`}>
                All
              </Link>
              {categories.map((c) => (
                <Link
                  key={c}
                  href={`/blog?category=${encodeURIComponent(c)}`}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium ${category === c ? 'bg-corner-ink text-white' : 'border border-corner-border bg-white text-corner-ink hover:bg-corner-bg'}`}
                >
                  {c}
                </Link>
              ))}
              {tags.map((t) => (
                <Link
                  key={t}
                  href={`/blog?tag=${encodeURIComponent(t)}`}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium ${tag === t ? 'bg-corner-ink text-white' : 'border border-corner-border bg-white text-corner-ink hover:bg-corner-bg'}`}
                >
                  #{t}
                </Link>
              ))}
            </div>
          )}

          {posts.length === 0 ? (
            <p className="text-center text-corner-muted">No posts yet — check back soon.</p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="card block transition hover:-translate-y-0.5">
                  {post.featured_image_url ? (
                    <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
                      <Image src={post.featured_image_url} alt={post.featured_image_alt || post.title} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] rounded-lg bg-gradient-to-br from-corner-forest/15 via-corner-stone to-corner-gold/15" />
                  )}
                  <p className="mt-4 text-xs uppercase tracking-wide text-corner-muted">
                    {post.category ?? 'Journal'} {post.published_at && `· ${formatDate(post.published_at)}`}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold text-corner-charcoal">{post.title}</h2>
                  <p className="mt-2 text-sm text-corner-muted">{post.excerpt || excerptFromContent(post.content, 140)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

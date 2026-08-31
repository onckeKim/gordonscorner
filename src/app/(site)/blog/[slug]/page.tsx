import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { JsonLd } from '@/components/JsonLd';
import { getPublishedPostBySlug } from '@/lib/blog/store';
import { renderBlogContent, excerptFromContent } from '@/lib/blog/render';
import { blogPostingJsonLd, absoluteUrl } from '@/lib/seo';
import { siteConfig } from '@/lib/config';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return {};

  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || excerptFromContent(post.content);
  const image = post.social_image_url || post.featured_image_url || absoluteUrl('/opengraph-image');

  return {
    title,
    description,
    alternates: { canonical: post.canonical_url || `/blog/${post.slug}` },
    openGraph: { title, description, type: 'article', images: [{ url: image }] },
    twitter: { title, description, images: [image] },
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const bodyHtml = renderBlogContent(post.content);

  return (
    <div>
      <Breadcrumbs items={[{ name: 'Blog', path: '/blog' }, { name: post.title, path: `/blog/${post.slug}` }]} />
      <JsonLd data={blogPostingJsonLd(post)} />

      <article className="mx-auto max-w-3xl px-6 py-16">
        <p className="eyebrow">{post.category ?? 'Journal'}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-corner-charcoal sm:text-5xl">{post.title}</h1>
        <p className="mt-4 text-sm text-corner-muted">
          {formatDate(post.published_at)}
          {post.author_name && <> · {post.author_name}</>}
        </p>

        {post.featured_image_url && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-xl2">
            <Image src={post.featured_image_url} alt={post.featured_image_alt || post.title} fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" priority />
          </div>
        )}

        {/* eslint-disable-next-line react/no-danger -- bodyHtml is built by renderBlogContent(), which HTML-escapes every line of source text before adding markup. */}
        <div className="blog-content mt-10" dangerouslySetInnerHTML={{ __html: bodyHtml }} />

        {post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-corner-stone pt-6">
            {post.tags.map((tag) => (
              <a key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`} className="rounded-full border border-corner-border px-3 py-1 text-xs text-corner-muted hover:bg-corner-bg">
                #{tag}
              </a>
            ))}
          </div>
        )}

        <p className="mt-10 text-sm text-corner-muted">
          Interested in staying at {siteConfig.propertyName}?{' '}
          <a href="/book" className="text-corner-gold underline hover:no-underline">
            Check availability
          </a>
          .
        </p>
      </article>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { excerptFromContent } from '@/lib/blog/render';
import type { BlogPost } from '@/types/database';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true }, // search-result pages aren't worth indexing individually
};

async function searchPosts(q: string): Promise<BlogPost[]> {
  if (!q.trim()) return [];
  const db = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const term = `%${q.trim()}%`;
  const { data } = await db
    .from('blog_posts')
    .select('*')
    .or(`title.ilike.${term},excerpt.ilike.${term},content.ilike.${term}`)
    .or(`status.eq.published,and(status.eq.scheduled,published_at.lte.${nowIso})`)
    .order('published_at', { ascending: false })
    .limit(20);
  return data ?? [];
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const results = q ? await searchPosts(q) : [];

  return (
    <div>
      <Breadcrumbs items={[{ name: 'Search', path: '/search' }]} />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-display text-3xl font-semibold text-corner-charcoal">Search</h1>
        <form className="mt-6 flex gap-3">
          <input name="q" defaultValue={q ?? ''} className="input" placeholder="Search the blog…" />
          <button type="submit" className="btn-primary shrink-0">
            Search
          </button>
        </form>

        {q && (
          <p className="mt-8 text-sm text-corner-muted">
            {results.length} result{results.length === 1 ? '' : 's'} for &ldquo;{q}&rdquo;
          </p>
        )}

        <ul className="mt-4 space-y-6">
          {results.map((post) => (
            <li key={post.id} className="border-t border-corner-stone pt-6 first:border-t-0 first:pt-0">
              <Link href={`/blog/${post.slug}`} className="font-display text-xl font-semibold text-corner-charcoal hover:text-corner-gold">
                {post.title}
              </Link>
              <p className="mt-1 text-sm text-corner-muted">{post.excerpt || excerptFromContent(post.content, 160)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

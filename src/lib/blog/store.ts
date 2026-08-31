import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { writeAuditLog, type AuditActor } from '@/lib/audit';
import { isValidSlug } from './slug';
import type { BlogPost, BlogPostStatus, BlogSchemaType } from '@/types/database';

export class BlogStoreError extends Error {}

const PUBLIC_LIST_COLUMNS = '*';

/** Public: posts visible right now — published, or scheduled with a published_at that has already passed. */
export async function listPublishedPosts(opts: { category?: string; tag?: string; limit?: number; offset?: number } = {}): Promise<BlogPost[]> {
  const db = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  let query = db
    .from('blog_posts')
    .select(PUBLIC_LIST_COLUMNS)
    .or(`status.eq.published,and(status.eq.scheduled,published_at.lte.${nowIso})`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (opts.category) query = query.eq('category', opts.category);
  if (opts.tag) query = query.contains('tags', [opts.tag]);
  if (opts.limit) query = query.limit(opts.limit);
  if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 20) - 1);

  const { data } = await query;
  return data ?? [];
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const db = createAdminSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data } = await db
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .or(`status.eq.published,and(status.eq.scheduled,published_at.lte.${nowIso})`)
    .maybeSingle();
  return data;
}

/** Admin: every post regardless of status, most recently updated first. */
export async function listAllPostsForAdmin(): Promise<BlogPost[]> {
  const db = createAdminSupabaseClient();
  const { data } = await db.from('blog_posts').select('*').order('updated_at', { ascending: false });
  return data ?? [];
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const db = createAdminSupabaseClient();
  const { data } = await db.from('blog_posts').select('*').eq('id', id).maybeSingle();
  return data;
}

export interface BlogPostInput {
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  featured_image_url?: string;
  featured_image_alt?: string;
  category?: string;
  tags?: string[];
  status: BlogPostStatus;
  published_at?: string | null;
  author_name?: string;
  meta_title?: string;
  meta_description?: string;
  focus_keyword?: string;
  canonical_url?: string;
  social_image_url?: string;
  schema_type?: BlogSchemaType;
}

function validateInput(input: BlogPostInput) {
  if (!isValidSlug(input.slug)) {
    throw new BlogStoreError('Slug must be lowercase letters, numbers, and single hyphens only.');
  }
  if (!input.title.trim()) throw new BlogStoreError('Title is required.');
  if (input.status === 'scheduled' && !input.published_at) {
    throw new BlogStoreError('A scheduled post needs a publish date/time.');
  }
}

export async function createPost(actor: AuditActor, input: BlogPostInput): Promise<BlogPost> {
  validateInput(input);
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from('blog_posts')
    .insert({
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt || null,
      content: input.content,
      featured_image_url: input.featured_image_url || null,
      featured_image_alt: input.featured_image_alt || null,
      category: input.category || null,
      tags: input.tags ?? [],
      status: input.status,
      published_at: input.status === 'published' ? (input.published_at ?? new Date().toISOString()) : (input.published_at || null),
      author_id: actor.id,
      author_name: input.author_name || actor.email,
      meta_title: input.meta_title || null,
      meta_description: input.meta_description || null,
      focus_keyword: input.focus_keyword || null,
      canonical_url: input.canonical_url || null,
      social_image_url: input.social_image_url || null,
      schema_type: input.schema_type ?? 'BlogPosting',
    })
    .select('*')
    .single();

  if (error?.code === '23505') throw new BlogStoreError('That slug is already in use.');
  if (error || !data) throw new BlogStoreError('Could not create this post.');

  await writeAuditLog(actor, { action: 'blog.create', recordType: 'blog_post', recordId: data.id, changes: { slug: input.slug, status: input.status } });
  return data;
}

export async function updatePost(actor: AuditActor, id: string, input: BlogPostInput): Promise<BlogPost> {
  validateInput(input);
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from('blog_posts')
    .update({
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt || null,
      content: input.content,
      featured_image_url: input.featured_image_url || null,
      featured_image_alt: input.featured_image_alt || null,
      category: input.category || null,
      tags: input.tags ?? [],
      status: input.status,
      published_at: input.status === 'published' ? (input.published_at ?? new Date().toISOString()) : (input.published_at || null),
      author_name: input.author_name || undefined,
      meta_title: input.meta_title || null,
      meta_description: input.meta_description || null,
      focus_keyword: input.focus_keyword || null,
      canonical_url: input.canonical_url || null,
      social_image_url: input.social_image_url || null,
      schema_type: input.schema_type ?? 'BlogPosting',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error?.code === '23505') throw new BlogStoreError('That slug is already in use.');
  if (error || !data) throw new BlogStoreError('Could not update this post.');

  await writeAuditLog(actor, { action: 'blog.update', recordType: 'blog_post', recordId: id, changes: { slug: input.slug, status: input.status } });
  return data;
}

export async function deletePost(actor: AuditActor, id: string): Promise<void> {
  const db = createAdminSupabaseClient();
  await db.from('blog_posts').delete().eq('id', id);
  await writeAuditLog(actor, { action: 'blog.delete', recordType: 'blog_post', recordId: id });
}

export async function listCategoriesAndTags(): Promise<{ categories: string[]; tags: string[] }> {
  const db = createAdminSupabaseClient();
  const { data } = await db.from('blog_posts').select('category, tags').eq('status', 'published');
  const categories = new Set<string>();
  const tags = new Set<string>();
  for (const row of data ?? []) {
    if (row.category) categories.add(row.category);
    for (const t of row.tags ?? []) tags.add(t);
  }
  return { categories: [...categories].sort(), tags: [...tags].sort() };
}

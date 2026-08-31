'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BlogPost, BlogPostStatus, BlogSchemaType } from '@/types/database';
import { slugify } from '@/lib/blog/slug';
import { ContentScorePanel } from './ContentScorePanel';
import type { AiGeneratedDraft } from '@/lib/ai/generate';

type FormState = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featured_image_url: string;
  featured_image_alt: string;
  category: string;
  tagsInput: string;
  status: BlogPostStatus;
  published_at: string; // datetime-local value
  author_name: string;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  canonical_url: string;
  social_image_url: string;
  schema_type: BlogSchemaType;
};

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

/** Composes the AI draft's body + FAQ + CTA into one content string, in the same ##/blank-line format the editor and renderer both expect. */
function draftToContent(draft: AiGeneratedDraft): string {
  const parts = [draft.body.trim()];
  if (draft.faq.length > 0) {
    const faqBlock = ['## Frequently asked questions', ...draft.faq.map((f) => `### ${f.question}\n\n${f.answer}`)].join('\n\n');
    parts.push(faqBlock);
  }
  if (draft.cta) parts.push(draft.cta);
  return parts.join('\n\n');
}

function toFormState(post?: BlogPost, draft?: AiGeneratedDraft): FormState {
  return {
    slug: post?.slug ?? draft?.slug ?? '',
    title: post?.title ?? draft?.title ?? '',
    excerpt: post?.excerpt ?? '',
    content: post?.content ?? (draft ? draftToContent(draft) : ''),
    featured_image_url: post?.featured_image_url ?? '',
    featured_image_alt: post?.featured_image_alt ?? '',
    category: post?.category ?? '',
    tagsInput: (post?.tags ?? []).join(', '),
    status: post?.status ?? 'draft',
    published_at: toDatetimeLocal(post?.published_at ?? null),
    author_name: post?.author_name ?? '',
    meta_title: post?.meta_title ?? draft?.title ?? '',
    meta_description: post?.meta_description ?? draft?.metaDescription ?? '',
    focus_keyword: post?.focus_keyword ?? '',
    canonical_url: post?.canonical_url ?? '',
    social_image_url: post?.social_image_url ?? '',
    schema_type: post?.schema_type ?? 'BlogPosting',
  };
}

export function BlogPostEditor({ post, draft }: { post?: BlogPost; draft?: AiGeneratedDraft }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(toFormState(post, draft));
  const [slugTouched, setSlugTouched] = useState(Boolean(post || draft));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onTitleChange(title: string) {
    set('title', title);
    if (!slugTouched) set('slug', slugify(title));
  }

  const internalLinkCount = useMemo(() => (form.content.match(/\]\(\//g) ?? []).length, [form.content]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        slug: form.slug,
        title: form.title,
        excerpt: form.excerpt || undefined,
        content: form.content,
        featured_image_url: form.featured_image_url || undefined,
        featured_image_alt: form.featured_image_alt || undefined,
        category: form.category || undefined,
        tags: form.tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        status: form.status,
        published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
        author_name: form.author_name || undefined,
        meta_title: form.meta_title || undefined,
        meta_description: form.meta_description || undefined,
        focus_keyword: form.focus_keyword || undefined,
        canonical_url: form.canonical_url || undefined,
        social_image_url: form.social_image_url || undefined,
        schema_type: form.schema_type,
      };
      const res = await fetch(post ? `/api/admin/blog/${post.id}` : '/api/admin/blog', {
        method: post ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save this post.');
      router.push('/admin/blog');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!post) return;
    if (!confirm('Delete this post? This cannot be undone.')) return;
    setBusy(true);
    await fetch(`/api/admin/blog/${post.id}`, { method: 'DELETE' });
    router.push('/admin/blog');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
      <div className="space-y-6">
        {draft && draft.internalLinkSuggestions.length > 0 && (
          <div className="card border-corner-gold/40 bg-corner-gold/5">
            <p className="text-xs font-medium uppercase tracking-wide text-corner-gold-dark">AI draft — review before publishing</p>
            <p className="mt-2 text-sm text-corner-charcoal">Suggested internal links to add while editing:</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-corner-muted">
              {draft.internalLinkSuggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="card">
          <h2 className="font-display text-lg font-semibold">Content</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor="title">Title</label>
              <input id="title" className="input" value={form.title} onChange={(e) => onTitleChange(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="slug">URL slug</label>
              <input
                id="slug"
                className="input"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', e.target.value);
                }}
                required
              />
              <p className="mt-1 text-xs text-corner-muted">/blog/{form.slug || 'your-slug'}</p>
            </div>
            <div>
              <label className="label" htmlFor="excerpt">Excerpt (optional — used on the listing page if set)</label>
              <textarea id="excerpt" className="input" rows={2} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="content">
                Body — blank line between paragraphs, <code>## Heading</code>, <code>### Subheading</code>, <code>- item</code> lists
              </label>
              <textarea id="content" className="input font-mono text-sm" rows={20} value={form.content} onChange={(e) => set('content', e.target.value)} required />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-display text-lg font-semibold">Image</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="featured_image_url">Featured image URL</label>
              <input id="featured_image_url" className="input" value={form.featured_image_url} onChange={(e) => set('featured_image_url', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="featured_image_alt">Featured image alt text</label>
              <input id="featured_image_alt" className="input" value={form.featured_image_alt} onChange={(e) => set('featured_image_alt', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-display text-lg font-semibold">SEO</h2>
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="meta_title">Meta title</label>
                <input id="meta_title" className="input" value={form.meta_title} onChange={(e) => set('meta_title', e.target.value)} placeholder={form.title} />
              </div>
              <div>
                <label className="label" htmlFor="focus_keyword">Focus keyword</label>
                <input id="focus_keyword" className="input" value={form.focus_keyword} onChange={(e) => set('focus_keyword', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="meta_description">Meta description</label>
              <textarea id="meta_description" className="input" rows={2} value={form.meta_description} onChange={(e) => set('meta_description', e.target.value)} placeholder={form.excerpt} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="canonical_url">Canonical URL (optional)</label>
                <input id="canonical_url" className="input" value={form.canonical_url} onChange={(e) => set('canonical_url', e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="social_image_url">Social share image (optional)</label>
                <input id="social_image_url" className="input" value={form.social_image_url} onChange={(e) => set('social_image_url', e.target.value)} placeholder={form.featured_image_url} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="schema_type">Structured data type</label>
              <select id="schema_type" className="input" value={form.schema_type} onChange={(e) => set('schema_type', e.target.value as BlogSchemaType)}>
                <option value="BlogPosting">BlogPosting</option>
                <option value="Article">Article</option>
                <option value="NewsArticle">NewsArticle</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card">
          <h2 className="font-display text-lg font-semibold">Publish</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label className="label" htmlFor="status">Status</label>
              <select id="status" className="input" value={form.status} onChange={(e) => set('status', e.target.value as BlogPostStatus)}>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
              </select>
            </div>
            {(form.status === 'scheduled' || form.status === 'published') && (
              <div>
                <label className="label" htmlFor="published_at">
                  {form.status === 'scheduled' ? 'Publish at' : 'Published at'}
                </label>
                <input id="published_at" type="datetime-local" className="input" value={form.published_at} onChange={(e) => set('published_at', e.target.value)} />
              </div>
            )}
            <div>
              <label className="label" htmlFor="category">Category</label>
              <input id="category" className="input" list="blog-categories" value={form.category} onChange={(e) => set('category', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="tags">Tags (comma-separated)</label>
              <input id="tags" className="input" value={form.tagsInput} onChange={(e) => set('tagsInput', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="author_name">Author name</label>
              <input id="author_name" className="input" value={form.author_name} onChange={(e) => set('author_name', e.target.value)} />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-corner-error">{error}</p>}
          <div className="mt-4 flex items-center gap-3">
            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? 'Saving…' : post ? 'Save changes' : 'Create post'}
            </button>
            {post && (
              <button type="button" onClick={onDelete} disabled={busy} className="text-sm text-corner-danger hover:underline">
                Delete
              </button>
            )}
          </div>
        </div>

        <ContentScorePanel
          title={form.meta_title || form.title}
          description={form.meta_description || form.excerpt}
          content={form.content}
          focusKeyword={form.focus_keyword}
          featuredImageAlt={form.featured_image_alt}
          internalLinkCount={internalLinkCount}
        />
      </div>
    </form>
  );
}

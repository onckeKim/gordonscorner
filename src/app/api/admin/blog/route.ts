import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/admin';
import { listAllPostsForAdmin, createPost, BlogStoreError } from '@/lib/blog/store';
import { handleApiError } from '@/lib/api-response';

const postSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(400).optional(),
  content: z.string().max(50000),
  featured_image_url: z.string().trim().max(500).optional(),
  featured_image_alt: z.string().trim().max(200).optional(),
  category: z.string().trim().max(60).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
  status: z.enum(['draft', 'scheduled', 'published']),
  published_at: z.string().datetime().nullable().optional(),
  author_name: z.string().trim().max(120).optional(),
  meta_title: z.string().trim().max(200).optional(),
  meta_description: z.string().trim().max(400).optional(),
  focus_keyword: z.string().trim().max(100).optional(),
  canonical_url: z.string().trim().max(500).optional(),
  social_image_url: z.string().trim().max(500).optional(),
  schema_type: z.enum(['BlogPosting', 'Article', 'NewsArticle']).optional(),
});

export async function GET() {
  try {
    await requireRole('admin');
    const posts = await listAllPostsForAdmin();
    return NextResponse.json({ posts });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole('admin');
    const input = postSchema.parse(await request.json());
    const post = await createPost(admin, input);
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    if (err instanceof BlogStoreError) return NextResponse.json({ error: err.message }, { status: 400 });
    return handleApiError(err);
  }
}

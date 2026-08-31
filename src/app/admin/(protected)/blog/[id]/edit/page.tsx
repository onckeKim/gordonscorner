import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/admin';
import { getPostById } from '@/lib/blog/store';
import { BlogPostEditor } from '@/components/admin/BlogPostEditor';

export default async function AdminEditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole('admin');
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Edit post</h1>
      <div className="mt-6">
        <BlogPostEditor post={post} />
      </div>
    </div>
  );
}

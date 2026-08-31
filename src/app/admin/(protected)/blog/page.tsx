import Link from 'next/link';
import { requireRole } from '@/lib/auth/admin';
import { listAllPostsForAdmin } from '@/lib/blog/store';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-corner-bg text-corner-muted',
  scheduled: 'bg-corner-gold/15 text-corner-gold-dark',
  published: 'bg-corner-success/15 text-corner-success',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default async function AdminBlogListPage() {
  await requireRole('admin');
  const posts = await listAllPostsForAdmin();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">Blog</h1>
        <Link href="/admin/blog/new" className="btn-primary">
          New post
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl2 border border-corner-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-corner-bg text-xs uppercase tracking-wide text-corner-muted">
            <tr>
              <th className="px-5 py-3">Title</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Published</th>
              <th className="px-5 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-t border-corner-border">
                <td className="px-5 py-3">
                  <Link href={`/admin/blog/${post.id}/edit`} className="font-medium text-corner-ink hover:text-corner-gold">
                    {post.title}
                  </Link>
                  <p className="text-xs text-corner-muted">/blog/{post.slug}</p>
                </td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[post.status]}`}>{post.status}</span>
                </td>
                <td className="px-5 py-3 text-corner-muted">{post.category || '—'}</td>
                <td className="px-5 py-3 text-corner-muted">{formatDateTime(post.published_at)}</td>
                <td className="px-5 py-3 text-corner-muted">{formatDateTime(post.updated_at)}</td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-corner-muted">
                  No posts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

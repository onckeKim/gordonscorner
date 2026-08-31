import { requireRole } from '@/lib/auth/admin';
import { NewBlogPostForm } from '@/components/admin/NewBlogPostForm';

export default async function AdminNewBlogPostPage() {
  await requireRole('admin');

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">New post</h1>
      <div className="mt-6">
        <NewBlogPostForm />
      </div>
    </div>
  );
}

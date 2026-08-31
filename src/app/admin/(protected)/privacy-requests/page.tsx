import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { PrivacyRequestsList } from '@/components/admin/PrivacyRequestsList';
import type { PrivacyRequestStatus } from '@/types/database';

const STATUS_FILTERS = ['all', 'new', 'in_progress', 'completed', 'rejected'] as const;

export default async function AdminPrivacyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const activeStatus = (status ?? 'all') as (typeof STATUS_FILTERS)[number];

  const db = createAdminSupabaseClient();
  let query = db.from('privacy_requests').select('*').order('created_at', { ascending: false });
  if (activeStatus !== 'all') {
    query = query.eq('status', activeStatus as PrivacyRequestStatus);
  }
  const { data: requests } = await query;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">Privacy requests</h1>
        <p className="text-xs text-corner-muted">
          Guest data export, correction, and deletion requests submitted via /privacy-request.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={`/admin/privacy-requests?status=${s}`}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize ${
              activeStatus === s
                ? 'bg-corner-ink text-white'
                : 'border border-corner-border bg-white text-corner-ink hover:bg-corner-bg'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <PrivacyRequestsList requests={requests ?? []} />
      </div>
    </div>
  );
}

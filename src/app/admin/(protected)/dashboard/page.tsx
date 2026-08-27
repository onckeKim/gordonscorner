import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/StatusBadge';
import type { BookingStatus } from '@/types/database';

const FILTERS: { value: BookingStatus | 'all' | 'action_needed'; label: string }[] = [
  { value: 'action_needed', label: 'Needs action' },
  { value: 'all', label: 'All' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'accepted', label: 'Awaiting deposit' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'balance_paid', label: 'Fully paid' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ACTION_NEEDED_STATUSES: BookingStatus[] = ['pending_review', 'info_requested', 'dates_proposed'];

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = status ?? 'action_needed';

  const supabase = await createServerSupabaseClient();
  let query = supabase.from('bookings').select('*').order('created_at', { ascending: false });

  if (activeFilter === 'action_needed') {
    query = query.in('status', ACTION_NEEDED_STATUSES);
  } else if (activeFilter !== 'all') {
    query = query.eq('status', activeFilter as BookingStatus);
  }

  const { data: bookings } = await query;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Bookings</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/dashboard?status=${f.value}`}
            className={`rounded-full px-4 py-1.5 text-xs font-medium ${
              activeFilter === f.value
                ? 'bg-corner-ink text-white'
                : 'border border-corner-border bg-white text-corner-ink hover:bg-corner-bg'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-xl2 border border-corner-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-corner-bg text-xs uppercase tracking-wide text-corner-muted">
            <tr>
              <th className="px-5 py-3">Guest</th>
              <th className="px-5 py-3">Dates</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Requested</th>
            </tr>
          </thead>
          <tbody>
            {(bookings ?? []).map((b) => (
              <tr key={b.id} className="border-t border-corner-border hover:bg-corner-bg/60">
                <td className="px-5 py-4">
                  <Link href={`/admin/bookings/${b.id}`} className="font-medium hover:underline">
                    {b.guest_name}
                  </Link>
                  <p className="text-xs text-corner-muted">{b.guest_email}</p>
                </td>
                <td className="px-5 py-4">
                  {formatDate(b.check_in)} &rarr; {formatDate(b.check_out)}
                  <p className="text-xs text-corner-muted">{b.nights} nights</p>
                </td>
                <td className="px-5 py-4">{formatZar(b.total_amount)}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={b.status} />
                </td>
                <td className="px-5 py-4 text-corner-muted">{formatDate(b.created_at)}</td>
              </tr>
            ))}
            {(bookings ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-corner-muted">
                  No bookings in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

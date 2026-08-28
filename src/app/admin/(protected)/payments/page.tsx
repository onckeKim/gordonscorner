import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { PaymentStatus } from '@/types/database';

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  paid: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-stone-200 text-stone-700',
  refunded: 'bg-stone-200 text-stone-700',
  partially_refunded: 'bg-amber-100 text-amber-800',
};

const FILTERS: { value: PaymentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partially_refunded', label: 'Partially refunded' },
];

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = (status as PaymentStatus | 'all') ?? 'all';

  const supabase = await createServerSupabaseClient();
  let query = supabase.from('payments').select('*').order('created_at', { ascending: false });
  if (activeFilter !== 'all') {
    query = query.eq('status', activeFilter);
  }

  const [{ data: payments }, { data: bookings }] = await Promise.all([
    query,
    supabase.from('bookings').select('id, reference, guest_name'),
  ]);

  const bookingById = new Map((bookings ?? []).map((b) => [b.id, b]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">Payments</h1>
        <a href="/api/admin/payments/export" className="btn-secondary text-sm">
          Download CSV
        </a>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/payments?status=${f.value}`}
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

      <div className="mt-8 overflow-x-auto rounded-xl2 border border-corner-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-corner-bg text-xs uppercase tracking-wide text-corner-muted">
            <tr>
              <th className="px-5 py-3">Booking</th>
              <th className="px-5 py-3">Type</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Provider</th>
              <th className="px-5 py-3">Reference</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).map((p) => {
              const booking = bookingById.get(p.booking_id);
              return (
                <tr key={p.id} className="border-t border-corner-border hover:bg-corner-bg/60">
                  <td className="px-5 py-4">
                    <Link href={`/admin/bookings/${p.booking_id}`} className="font-medium hover:underline">
                      {booking?.guest_name ?? p.booking_id.slice(0, 8)}
                    </Link>
                    {booking?.reference && <p className="text-xs text-corner-muted">{booking.reference}</p>}
                  </td>
                  <td className="px-5 py-4 capitalize">{p.type}</td>
                  <td className="px-5 py-4">
                    {formatZar(p.amount)}
                    {p.refunded_amount > 0 && (
                      <p className="text-xs text-corner-muted">
                        {formatZar(p.refunded_amount)} refunded
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 capitalize">{p.provider}</td>
                  <td className="px-5 py-4 text-corner-muted">{p.provider_reference ?? '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[p.status]}`}>
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-corner-muted">{formatDateTime(p.paid_at ?? p.created_at)}</td>
                </tr>
              );
            })}
            {(payments ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-corner-muted">
                  No payments in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

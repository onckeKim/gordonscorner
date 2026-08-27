import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/StatusBadge';
import { BookingActions } from '@/components/admin/BookingActions';
import { bookingRules } from '@/lib/config';

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

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const [{ data: booking }, { data: history }, { data: payments }] = await Promise.all([
    supabase.from('bookings').select('*').eq('id', id).single(),
    supabase
      .from('booking_status_history')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('payments').select('*').eq('booking_id', id).order('created_at', { ascending: false }),
  ]);

  if (!booking) {
    notFound();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr,1fr]">
      <div className="space-y-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-semibold">{booking.guest_name}</h1>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-corner-muted">
            {booking.guest_email}
            {booking.guest_phone ? ` · ${booking.guest_phone}` : ''}
          </p>
          {booking.reference && (
            <p className="mt-2 font-display text-lg">{booking.reference}</p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-corner-border pt-4 text-sm sm:grid-cols-4">
            <div>
              <p className="label">Check-in</p>
              <p>{booking.check_in}</p>
            </div>
            <div>
              <p className="label">Check-out</p>
              <p>{booking.check_out}</p>
            </div>
            <div>
              <p className="label">Nights</p>
              <p>{booking.nights}</p>
            </div>
            <div>
              <p className="label">Guests</p>
              <p>{booking.guests_count}</p>
            </div>
          </div>

          <div className="mt-4 border-t border-corner-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-corner-muted">Total</span>
              <span>{formatZar(booking.total_amount)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-corner-muted">
                Deposit ({Math.round(bookingRules.depositRate * 100)}%)
                {booking.deposit_paid_at ? ` — paid ${formatDateTime(booking.deposit_paid_at)}` : ''}
              </span>
              <span>{formatZar(booking.deposit_amount)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-corner-muted">
                Balance
                {booking.balance_paid_at ? ` — paid ${formatDateTime(booking.balance_paid_at)}` : ' — outstanding'}
              </span>
              <span>{formatZar(booking.balance_amount)}</span>
            </div>
          </div>

          {booking.message && (
            <div className="mt-4 border-t border-corner-border pt-4 text-sm">
              <p className="label">Guest message</p>
              <p>{booking.message}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-display text-lg font-semibold">Payments</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs uppercase text-corner-muted">
              <tr>
                <th className="py-1.5">Type</th>
                <th className="py-1.5">Amount</th>
                <th className="py-1.5">Status</th>
                <th className="py-1.5">Reference</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="border-t border-corner-border">
                  <td className="py-1.5 capitalize">{p.type}</td>
                  <td className="py-1.5">{formatZar(p.amount)}</td>
                  <td className="py-1.5 capitalize">{p.status}</td>
                  <td className="py-1.5 text-corner-muted">{p.provider_reference ?? '—'}</td>
                </tr>
              ))}
              {(payments ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-corner-muted">
                    No payment attempts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="font-display text-lg font-semibold">History</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(history ?? []).map((h) => (
              <li key={h.id} className="flex justify-between border-t border-corner-border pt-2 first:border-t-0 first:pt-0">
                <span>
                  <span className="capitalize">{h.actor}</span> moved to{' '}
                  <span className="font-medium capitalize">{h.to_status.replace('_', ' ')}</span>
                  {h.note ? ` — ${h.note}` : ''}
                </span>
                <span className="shrink-0 text-corner-muted">{formatDateTime(h.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <BookingActions booking={booking} />
      </div>
    </div>
  );
}

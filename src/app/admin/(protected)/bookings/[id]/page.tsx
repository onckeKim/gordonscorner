import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/admin';
import { markUnderReviewIfNeeded } from '@/lib/booking/workflow';
import { StatusBadge } from '@/components/StatusBadge';
import { BookingActions } from '@/components/admin/BookingActions';
import { PriceBreakdown } from '@/components/PriceBreakdown';
import { PaymentsPanel } from '@/components/admin/PaymentsPanel';

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
  const admin = await requireAdmin();
  await markUnderReviewIfNeeded(id, admin.id);

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
            <div className="flex items-center gap-3">
              <a
                href={`/api/admin/bookings/export?bookingId=${id}`}
                className="text-xs text-corner-gold underline hover:no-underline"
              >
                Download booking record
              </a>
              <StatusBadge status={booking.status} />
            </div>
          </div>
          <p className="text-sm text-corner-muted">
            {booking.guest_email}
            {booking.guest_phone ? ` · ${booking.guest_phone}` : ''}
            {booking.guest_country ? ` · ${booking.guest_country}` : ''}
          </p>
          {booking.reference && (
            <p className="mt-2 font-display text-lg">{booking.reference}</p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-corner-stone pt-4 text-sm sm:grid-cols-4">
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
              <p>
                {booking.guests_count}
                {booking.adults_count != null && (
                  <span className="text-corner-muted">
                    {' '}
                    ({booking.adults_count} adult{booking.adults_count === 1 ? '' : 's'}
                    {booking.children_count ? `, ${booking.children_count} child${booking.children_count === 1 ? '' : 'ren'}` : ''})
                  </span>
                )}
              </p>
            </div>
            {booking.estimated_arrival_time && (
              <div>
                <p className="label">Est. arrival</p>
                <p>{booking.estimated_arrival_time}</p>
              </div>
            )}
            {booking.booking_purpose && (
              <div>
                <p className="label">Purpose</p>
                <p className="capitalize">{booking.booking_purpose}</p>
              </div>
            )}
          </div>

          <PriceBreakdown
            className="mt-4"
            nights={booking.nights}
            subtotalAmount={booking.accommodation_subtotal ?? undefined}
            cleaningFeeAmount={booking.cleaning_fee_amount}
            serviceFeeAmount={booking.service_fee_amount}
            discountAmount={booking.discount_amount}
            securityDepositAmount={booking.security_deposit_amount}
            totalAmount={booking.total_amount}
            depositAmount={booking.deposit_amount}
            balanceAmount={booking.balance_amount}
            depositPaid={Boolean(booking.deposit_paid_at)}
            balancePaid={Boolean(booking.balance_paid_at)}
          />

          {booking.message && (
            <div className="mt-4 border-t border-corner-stone pt-4 text-sm">
              <p className="label">Special requests</p>
              <p>{booking.message}</p>
            </div>
          )}
        </div>

        <PaymentsPanel bookingId={id} payments={payments ?? []} />

        <div className="card">
          <h2 className="font-display text-lg font-semibold">History</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(history ?? []).map((h) => (
              <li key={h.id} className="flex justify-between border-t border-corner-stone pt-2 first:border-t-0 first:pt-0">
                <span>
                  <span className="capitalize">{h.actor}</span> moved to{' '}
                  <span className="font-medium capitalize">{h.to_status.replace(/_/g, ' ')}</span>
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

import { notFound } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { StatusBadge } from '@/components/StatusBadge';
import { ProposalResponse } from '@/components/ProposalResponse';
import { bookingRules } from '@/lib/config';

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function getBooking(idOrReference: string) {
  const db = createAdminSupabaseClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrReference);
  const { data } = await db
    .from('bookings')
    .select('*')
    .eq(isUuid ? 'id' : 'reference', idOrReference)
    .single();
  return data;
}

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBooking(id);

  if (!booking) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Your booking</h1>
        <StatusBadge status={booking.status} />
      </div>

      <div className="card space-y-4">
        {booking.reference && (
          <div>
            <p className="label">Booking reference</p>
            <p className="font-display text-2xl">{booking.reference}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="label">Check-in</p>
            <p>{formatDate(booking.check_in)}</p>
          </div>
          <div>
            <p className="label">Check-out</p>
            <p>{formatDate(booking.check_out)}</p>
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

        <div className="border-t border-corner-border pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-corner-muted">Total</span>
            <span>{formatZar(booking.total_amount)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-corner-muted">
              Deposit ({Math.round(bookingRules.depositRate * 100)}%)
              {booking.deposit_paid_at ? ' — paid' : ''}
            </span>
            <span>{formatZar(booking.deposit_amount)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-corner-muted">
              Balance{booking.balance_paid_at ? ' — paid' : ''}
            </span>
            <span>{formatZar(booking.balance_amount)}</span>
          </div>
        </div>

        {booking.status === 'info_requested' && booking.info_request_message && (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">We need a little more information:</p>
            <p className="mt-1">{booking.info_request_message}</p>
            <p className="mt-2 text-xs">
              Please reply to your confirmation email or contact us directly.
            </p>
          </div>
        )}

        {booking.status === 'dates_proposed' &&
          booking.proposed_check_in &&
          booking.proposed_check_out && (
            <ProposalResponse
              bookingId={booking.id}
              proposedCheckIn={booking.proposed_check_in}
              proposedCheckOut={booking.proposed_check_out}
            />
          )}

        {booking.status === 'accepted' && (
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
            Check your inbox for a secure link to pay your deposit and confirm this booking.
          </div>
        )}

        {(booking.status === 'confirmed' || booking.status === 'balance_paid') && (
          <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
            You&rsquo;re all set — we look forward to hosting you.
          </div>
        )}

        {booking.status === 'declined' && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-900">
            {booking.decline_reason || 'This request could not be accommodated.'}
          </div>
        )}
      </div>
    </div>
  );
}

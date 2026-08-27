import { notFound } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { StatusBadge } from '@/components/StatusBadge';
import { ProposalResponse } from '@/components/ProposalResponse';
import { ConfirmationScreen } from '@/components/ConfirmationScreen';
import { PriceBreakdown } from '@/components/PriceBreakdown';
import { Alert } from '@/components/ui/Alert';

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

  if (booking.status === 'confirmed' || booking.status === 'balance_paid') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <ConfirmationScreen
          guestName={booking.guest_name}
          reference={booking.reference ?? '—'}
          checkIn={booking.check_in}
          checkOut={booking.check_out}
          nights={booking.nights}
          guestsCount={booking.guests_count}
          totalAmount={booking.total_amount}
          depositAmount={booking.deposit_amount}
          balanceAmount={booking.balance_amount}
          balancePaid={booking.status === 'balance_paid'}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Your booking</h1>
        <StatusBadge status={booking.status} />
      </div>

      <div className="card space-y-5">
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

        <PriceBreakdown
          nights={booking.nights}
          totalAmount={booking.total_amount}
          depositAmount={booking.deposit_amount}
          balanceAmount={booking.balance_amount}
          depositPaid={Boolean(booking.deposit_paid_at)}
          balancePaid={Boolean(booking.balance_paid_at)}
        />

        {booking.status === 'info_requested' && booking.info_request_message && (
          <Alert
            variant="warning"
            title="We need a little more information"
            description={`${booking.info_request_message} — please reply to your confirmation email or contact us directly.`}
          />
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
          <Alert
            variant="info"
            title="Almost there"
            description="Check your inbox for a secure link to pay your deposit and confirm this booking."
          />
        )}

        {booking.status === 'declined' && (
          <Alert
            variant="error"
            title="This request could not be accommodated"
            description={booking.decline_reason ?? undefined}
          />
        )}

        {booking.status === 'expired' && (
          <Alert
            variant="error"
            title="This request has expired"
            description="The deposit wasn't received within the hold window, so these dates were released. Feel free to submit a new request."
          />
        )}

        {booking.status === 'cancelled' && (
          <Alert variant="error" title="This booking was cancelled" />
        )}
      </div>
    </div>
  );
}

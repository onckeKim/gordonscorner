import { redirect, notFound } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getPaymentProvider } from '@/lib/payments';
import { markDepositProcessing } from '@/lib/booking/workflow';
import { siteConfig } from '@/lib/config';
import type { PaymentType } from '@/types/database';

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

const DEPOSIT_DUE_STATUSES = ['accepted_awaiting_deposit', 'deposit_processing'];
const BALANCE_DUE_STATUSES = ['confirmed', 'checked_in', 'checked_out'];

export default async function PayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = createAdminSupabaseClient();
  const { data: booking } = await db
    .from('bookings')
    .select('*')
    .eq('payment_token', token)
    .single();

  if (!booking) {
    notFound();
  }

  const holdExpired =
    booking.status === 'accepted_awaiting_deposit' &&
    Boolean(booking.hold_expires_at) &&
    new Date(booking.hold_expires_at as string).getTime() < Date.now();

  if (booking.status === 'expired' || holdExpired) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">This payment link has expired</h1>
        <p className="mt-2 text-sm text-corner-muted">
          The dates held for this booking were released because payment wasn&rsquo;t completed in
          time. Please get in touch with us and we&rsquo;ll be happy to check availability again.
        </p>
        <a href="/contact" className="btn-primary mt-6 inline-flex">
          Contact us
        </a>
      </div>
    );
  }

  if (['declined', 'cancelled', 'no_show'].includes(booking.status)) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">This payment link is no longer valid</h1>
        <p className="mt-2 text-sm text-corner-muted">
          This booking is no longer active, so there&rsquo;s nothing to pay on this link.
        </p>
        <a href="/contact" className="btn-primary mt-6 inline-flex">
          Contact us
        </a>
      </div>
    );
  }

  let type: PaymentType | null = null;
  if (DEPOSIT_DUE_STATUSES.includes(booking.status)) {
    type = 'deposit';
  } else if (BALANCE_DUE_STATUSES.includes(booking.status) && !booking.balance_paid_at) {
    type = 'balance';
  }

  if (!type) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">This payment has already been completed</h1>
        <p className="mt-2 text-sm text-corner-muted">
          There&rsquo;s nothing outstanding on this link right now.
        </p>
        <a href={`/booking/${booking.id}`} className="btn-primary mt-6 inline-flex">
          View your booking
        </a>
      </div>
    );
  }

  if (type === 'deposit') {
    await markDepositProcessing(booking.id);
  }

  const { data: attempt } = await db
    .from('payments')
    .select('idempotency_key')
    .eq('booking_id', booking.id)
    .eq('type', type)
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!attempt?.idempotency_key) {
    // Shouldn't happen — createPaymentLink always creates this row when the
    // link is first generated — but fail safely rather than checkout with
    // no idempotency tracking.
    notFound();
  }

  const amount = type === 'deposit' ? booking.deposit_amount : booking.balance_amount;
  const returnUrl = `${siteConfig.siteUrl}/pay/${token}/return?outcome=success`;
  const cancelUrl = `${siteConfig.siteUrl}/pay/${token}/return?outcome=cancelled`;
  const notifyUrl = `${siteConfig.siteUrl}/api/payments/webhook`;

  const payload = await getPaymentProvider().buildCheckout({
    booking,
    type,
    amount,
    returnUrl,
    cancelUrl,
    notifyUrl,
    idempotencyKey: attempt.idempotency_key,
  });

  if (payload.kind === 'redirect') {
    redirect(payload.url);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="font-display text-2xl font-semibold">
        Pay your {type === 'deposit' ? 'deposit' : 'balance'}
      </h1>
      <p className="mt-2 text-sm text-corner-muted">
        Booking for {booking.check_in} &rarr; {booking.check_out}
      </p>
      <div className="card mt-6">
        <p className="text-sm text-corner-muted">Amount due</p>
        <p className="font-display text-3xl font-semibold">{formatZar(amount)}</p>
        <form action={payload.actionUrl} method={payload.method} className="mt-6">
          {Object.entries(payload.fields).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <button type="submit" className="btn-primary w-full">
            Continue to secure payment
          </button>
        </form>
        <p className="mt-3 text-center text-xs text-corner-muted">
          You&rsquo;ll be redirected to our payment provider to complete this securely.
        </p>
      </div>
    </div>
  );
}

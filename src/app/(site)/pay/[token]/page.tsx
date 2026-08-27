import { redirect, notFound } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getPaymentProvider } from '@/lib/payments';
import { siteConfig } from '@/lib/config';
import type { PaymentType } from '@/types/database';

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

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

  let type: PaymentType | null = null;
  if (booking.status === 'accepted') type = 'deposit';
  else if (booking.status === 'confirmed') type = 'balance';

  if (!type) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">This payment link has been used</h1>
        <p className="mt-2 text-sm text-corner-muted">
          There&rsquo;s nothing outstanding on this link right now.
        </p>
        <a href={`/booking/${booking.id}`} className="btn-primary mt-6 inline-flex">
          View your booking
        </a>
      </div>
    );
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

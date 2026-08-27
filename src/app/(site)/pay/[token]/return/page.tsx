import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export default async function PayReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { token } = await params;
  const { outcome } = await searchParams;

  const db = createAdminSupabaseClient();
  const { data: booking } = await db
    .from('bookings')
    .select('id, status')
    .eq('payment_token', token)
    .single();

  const cancelled = outcome === 'cancelled';

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">
        {cancelled ? 'Payment not completed' : 'Thank you'}
      </h1>
      <p className="mt-2 text-sm text-corner-muted">
        {cancelled
          ? 'You can retry the payment using the same link from your email.'
          : 'We’re confirming your payment now — this page will update shortly, and you’ll receive an email as soon as it’s confirmed.'}
      </p>
      {booking && (
        <a href={`/booking/${booking.id}`} className="btn-primary mt-6 inline-flex">
          View your booking status
        </a>
      )}
    </div>
  );
}

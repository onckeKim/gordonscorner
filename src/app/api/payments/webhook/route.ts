import { NextResponse, type NextRequest } from 'next/server';
import { getPaymentProvider } from '@/lib/payments';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  markDepositPaid,
  markDepositFailed,
  markBalancePaidViaPayment,
  WorkflowError,
} from '@/lib/booking/workflow';

export const dynamic = 'force-dynamic';

/**
 * Server-to-server payment notification endpoint (PayFast ITN / dev
 * simulator). Must remain unauthenticated (the provider calls it directly)
 * — trust is established via signature verification inside parseWebhook.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const provider = getPaymentProvider();

  let event;
  try {
    event = await provider.parseWebhook(rawBody, request.headers);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse payment webhook:', err);
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 });
  }

  if (!event.verified) {
    // eslint-disable-next-line no-console
    console.error('Payment webhook signature verification failed.', event.raw);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  const db = createAdminSupabaseClient();

  // Record the payment attempt regardless of outcome, for the audit trail.
  const { data: pendingPayment } = await db
    .from('payments')
    .select('id')
    .eq('booking_id', event.bookingId)
    .eq('type', event.paymentType)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingPayment) {
    await db
      .from('payments')
      .update({
        status: event.status === 'paid' ? 'paid' : event.status,
        provider_reference: event.providerReference,
        raw_payload: event.raw,
      })
      .eq('id', pendingPayment.id);
  } else {
    await db.from('payments').insert({
      booking_id: event.bookingId,
      type: event.paymentType,
      provider: provider.name,
      provider_reference: event.providerReference,
      amount: event.amount ?? 0,
      status: event.status === 'paid' ? 'paid' : event.status,
      raw_payload: event.raw,
    });
  }

  try {
    if (event.status === 'paid') {
      if (event.paymentType === 'deposit') {
        await markDepositPaid(event.bookingId);
      } else {
        await markBalancePaidViaPayment(event.bookingId);
      }
    } else if (event.paymentType === 'deposit') {
      // Failed/cancelled deposit attempt — return to accepted_awaiting_deposit
      // so the guest can retry from the same link, as long as the hold hasn't lapsed.
      await markDepositFailed(event.bookingId);
    }
  } catch (err) {
    if (!(err instanceof WorkflowError)) {
      // eslint-disable-next-line no-console
      console.error('Failed to apply webhook to booking:', err);
      return NextResponse.json({ error: 'Failed to process payment.' }, { status: 500 });
    }
    // WorkflowError here typically means the booking was already in a
    // later state (idempotent replay) — safe to acknowledge as OK.
  }

  return NextResponse.json({ ok: true });
}

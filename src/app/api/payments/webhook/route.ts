import { NextResponse, type NextRequest } from 'next/server';
import { getPaymentProvider } from '@/lib/payments';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import {
  markDepositPaid,
  markDepositFailed,
  markBalancePaidViaPayment,
  WorkflowError,
} from '@/lib/booking/workflow';
import { sendReceiptEmail, sendPaymentFailedEmail } from '@/lib/email';
import { siteConfig } from '@/lib/config';
import type { WebhookEvent } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const UNIQUE_VIOLATION = '23505';

type Db = ReturnType<typeof createAdminSupabaseClient>;

async function logEvent(
  db: Db,
  fields: {
    bookingId?: string | null;
    paymentId?: string | null;
    eventType: string;
    provider?: string;
    note?: string;
    raw?: Record<string, unknown>;
  },
) {
  await db.from('payment_events').insert({
    booking_id: fields.bookingId ?? null,
    payment_id: fields.paymentId ?? null,
    event_type: fields.eventType,
    provider: fields.provider ?? null,
    actor: 'system',
    note: fields.note ?? null,
    raw_payload: fields.raw ?? null,
  });
}

/**
 * Server-to-server payment notification endpoint (PayFast ITN / dev
 * simulator). Must remain unauthenticated (the provider calls it directly)
 * — trust is established via signature verification (+ PayFast's remote
 * validate round-trip) inside parseWebhook. Every call is logged to
 * payment_events regardless of outcome, so nothing here is ever silently
 * dropped.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const provider = getPaymentProvider();
  const db = createAdminSupabaseClient();

  let event: WebhookEvent;
  try {
    event = await provider.parseWebhook(rawBody, request.headers);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse payment webhook:', err);
    await logEvent(db, { eventType: 'malformed_payload', provider: provider.name, raw: { rawBody } });
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 });
  }

  await logEvent(db, {
    bookingId: event.bookingId || null,
    eventType: 'webhook_received',
    provider: provider.name,
    note: `status=${event.status} type=${event.paymentType}`,
    raw: event.raw,
  });

  if (!event.verified) {
    // eslint-disable-next-line no-console
    console.error('Payment webhook failed verification.', event.raw);
    await logEvent(db, {
      bookingId: event.bookingId || null,
      eventType: 'verification_failed',
      provider: provider.name,
      raw: event.raw,
    });
    return NextResponse.json({ error: 'Could not verify this notification.' }, { status: 400 });
  }

  // --- Idempotency: has this exact provider transaction already been recorded? ---
  if (event.providerReference) {
    const { data: alreadyRecorded } = await db
      .from('payments')
      .select('id, status')
      .eq('provider', provider.name)
      .eq('provider_reference', event.providerReference)
      .maybeSingle();

    if (alreadyRecorded && alreadyRecorded.status !== 'pending' && alreadyRecorded.status !== 'processing') {
      // Already fully processed — this is a retried/duplicate delivery.
      // Acknowledge without reapplying anything.
      await logEvent(db, {
        bookingId: event.bookingId,
        paymentId: alreadyRecorded.id,
        eventType: 'duplicate_ignored',
        provider: provider.name,
        note: `provider_reference ${event.providerReference} already ${alreadyRecorded.status}`,
      });
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  // --- Find the payment attempt this event applies to ---
  let attemptQuery = db
    .from('payments')
    .select('*')
    .eq('booking_id', event.bookingId)
    .eq('type', event.paymentType)
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (event.idempotencyKey) {
    attemptQuery = db
      .from('payments')
      .select('*')
      .eq('idempotency_key', event.idempotencyKey)
      .limit(1);
  }

  const { data: attempts } = await attemptQuery;
  const attempt = attempts?.[0];

  const { data: booking } = await db.from('bookings').select('*').eq('id', event.bookingId).single();
  const expectedAmount = !booking
    ? null
    : event.paymentType === 'deposit'
      ? booking.deposit_amount
      : booking.balance_amount;

  const newStatus = event.status === 'paid' ? 'paid' : event.status;
  const paidAt = event.status === 'paid' ? new Date().toISOString() : null;

  let paymentId: string | null = attempt?.id ?? null;
  try {
    if (attempt) {
      const { error } = await db
        .from('payments')
        .update({
          status: newStatus,
          provider_reference: event.providerReference,
          raw_payload: event.raw,
          paid_at: paidAt,
          amount: event.amount ?? attempt.amount,
        })
        .eq('id', attempt.id);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await db
        .from('payments')
        .insert({
          booking_id: event.bookingId,
          type: event.paymentType,
          provider: provider.name,
          provider_reference: event.providerReference,
          amount: event.amount ?? expectedAmount ?? 0,
          status: newStatus,
          raw_payload: event.raw,
          paid_at: paidAt,
          idempotency_key: event.idempotencyKey,
        })
        .select('id')
        .single();
      if (error) throw error;
      paymentId = inserted?.id ?? null;
    }
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === UNIQUE_VIOLATION) {
      // Lost a race with another delivery of the same transaction — the
      // other request already recorded it. Safe to acknowledge as a no-op.
      await logEvent(db, {
        bookingId: event.bookingId,
        eventType: 'duplicate_ignored',
        provider: provider.name,
        note: 'Unique constraint caught a concurrent duplicate webhook delivery.',
      });
      return NextResponse.json({ ok: true, duplicate: true });
    }
    // eslint-disable-next-line no-console
    console.error('Failed to record payment from webhook:', err);
    await logEvent(db, { bookingId: event.bookingId, eventType: 'record_failed', provider: provider.name });
    return NextResponse.json({ error: 'Failed to record payment.' }, { status: 500 });
  }

  // --- Over/underpayment detection (paid events only) ---
  if (event.status === 'paid' && expectedAmount != null && event.amount != null) {
    const diff = Math.round((event.amount - expectedAmount) * 100) / 100;
    if (Math.abs(diff) >= 0.01) {
      const kind = diff > 0 ? 'overpayment_detected' : 'underpayment_detected';
      await logEvent(db, {
        bookingId: event.bookingId,
        paymentId,
        eventType: kind,
        provider: provider.name,
        note: `Expected ${expectedAmount}, received ${event.amount} (${diff > 0 ? '+' : ''}${diff}).`,
      });
      if (booking) {
        const flag = `[${new Date().toISOString()}] ${kind === 'overpayment_detected' ? 'Overpayment' : 'Underpayment'}: expected ${expectedAmount}, received ${event.amount} — needs manual reconciliation.`;
        await db
          .from('bookings')
          .update({ admin_notes: booking.admin_notes ? `${booking.admin_notes}\n${flag}` : flag })
          .eq('id', booking.id);
      }
    }
  }

  // --- Apply the booking-level transition ---
  try {
    if (event.status === 'paid') {
      let confirmedBooking = null;
      if (event.paymentType === 'deposit') {
        confirmedBooking = await markDepositPaid(event.bookingId);
      } else if (event.paymentType === 'balance') {
        confirmedBooking = await markBalancePaidViaPayment(event.bookingId);
      }
      if (confirmedBooking && paymentId) {
        const { data: paidPayment } = await db.from('payments').select('*').eq('id', paymentId).single();
        if (paidPayment) {
          await sendReceiptEmail(confirmedBooking, paidPayment);
        }
      }
    } else {
      if (event.paymentType === 'deposit') {
        // Failed/cancelled deposit attempt — return to accepted_awaiting_deposit
        // so the guest can retry from the same link, as long as the hold hasn't lapsed.
        await markDepositFailed(event.bookingId);
      }
      // Balance failures don't change booking status (it's already confirmed
      // either way) — just let the guest know so they can retry.
      if (booking?.payment_token && (event.paymentType === 'deposit' || event.paymentType === 'balance')) {
        await sendPaymentFailedEmail(
          booking,
          `${siteConfig.siteUrl}/pay/${booking.payment_token}`,
          event.paymentType,
        );
      }
    }
    await logEvent(db, {
      bookingId: event.bookingId,
      paymentId,
      eventType: 'applied',
      provider: provider.name,
      note: `${event.paymentType} ${event.status}`,
    });
  } catch (err) {
    if (!(err instanceof WorkflowError)) {
      // eslint-disable-next-line no-console
      console.error('Failed to apply webhook to booking:', err);
      await logEvent(db, { bookingId: event.bookingId, paymentId, eventType: 'apply_failed', provider: provider.name });
      return NextResponse.json({ error: 'Failed to process payment.' }, { status: 500 });
    }
    // WorkflowError here typically means the booking was already in a
    // later state (idempotent replay) — safe to acknowledge as OK.
    await logEvent(db, {
      bookingId: event.bookingId,
      paymentId,
      eventType: 'apply_no_op',
      provider: provider.name,
      note: err.message,
    });
  }

  return NextResponse.json({ ok: true });
}

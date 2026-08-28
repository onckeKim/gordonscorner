import 'server-only';
import { randomUUID } from 'crypto';
import { siteConfig, paymentConfig } from '@/lib/config';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { payfastProvider } from './payfast';
import { devPaymentProvider } from './dev-adapter';
import type { PaymentProvider } from './types';
import type { Booking, PaymentType } from '@/types/database';

export type { PaymentProvider, CheckoutPayload, WebhookEvent } from './types';

const providers: Record<string, PaymentProvider> = {
  payfast: payfastProvider,
  dev: devPaymentProvider,
  // Add 'peach' / 'yoco' adapters here following the PaymentProvider
  // interface in ./types.ts, then register them in this map.
};

/**
 * Resolves the active payment provider. Falls back to the dev adapter (with
 * a console warning) if a live provider is selected but not fully
 * configured, so a missing env var never silently breaks the booking flow.
 */
export function getPaymentProvider(): PaymentProvider {
  const configured = providers[paymentConfig.provider];
  if (!configured) {
    // eslint-disable-next-line no-console
    console.warn(`Unknown PAYMENT_PROVIDER "${paymentConfig.provider}", falling back to dev adapter.`);
    return devPaymentProvider;
  }

  if (paymentConfig.provider === 'payfast') {
    const hasCreds = Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY);
    if (!hasCreds) {
      // eslint-disable-next-line no-console
      console.warn('PAYFAST_MERCHANT_ID/KEY not set — using dev payment adapter instead.');
      return devPaymentProvider;
    }
  }

  return configured;
}

/**
 * Creates (or reuses) the guest-facing payment link for a booking.
 *
 * Idempotent by design: if an attempt for this booking+type is already
 * pending/processing, its existing idempotency_key and payment row are
 * reused rather than creating a new one — so re-sending a link, or the
 * guest simply reloading /pay/[token], never piles up duplicate payment
 * records. A fresh attempt (new idempotency_key + payment row) is only
 * created after the previous one reached a terminal state (paid/failed/
 * cancelled).
 */
export async function createPaymentLink(
  booking: Booking,
  type: PaymentType,
): Promise<{ url: string; idempotencyKey: string }> {
  if (!booking.payment_token) {
    throw new Error('Booking has no payment_token set.');
  }

  const db = createAdminSupabaseClient();
  const amount = type === 'deposit' ? booking.deposit_amount : booking.balance_amount;
  const provider = getPaymentProvider().name;

  const { data: existing } = await db
    .from('payments')
    .select('id, idempotency_key')
    .eq('booking_id', booking.id)
    .eq('type', type)
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.idempotency_key) {
    return { url: `${siteConfig.siteUrl}/pay/${booking.payment_token}`, idempotencyKey: existing.idempotency_key };
  }

  const idempotencyKey = randomUUID();
  await db.from('payments').insert({
    booking_id: booking.id,
    type,
    provider,
    amount,
    status: 'pending',
    idempotency_key: idempotencyKey,
  });

  await db.from('payment_events').insert({
    booking_id: booking.id,
    event_type: 'payment_link_created',
    provider,
    actor: 'system',
    note: `${type} payment link created for ${amount}`,
  });

  return { url: `${siteConfig.siteUrl}/pay/${booking.payment_token}`, idempotencyKey };
}

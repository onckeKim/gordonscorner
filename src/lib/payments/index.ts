import 'server-only';
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
 * Creates (or reuses) the guest-facing payment link for a booking, and
 * records a "pending" payment row so admins can see the outstanding
 * request on the booking detail page.
 */
export async function createPaymentLink(
  booking: Booking,
  type: PaymentType,
): Promise<{ url: string }> {
  if (!booking.payment_token) {
    throw new Error('Booking has no payment_token set.');
  }

  const db = createAdminSupabaseClient();
  const amount = type === 'deposit' ? booking.deposit_amount : booking.balance_amount;

  await db.from('payments').insert({
    booking_id: booking.id,
    type,
    provider: getPaymentProvider().name,
    amount,
    status: 'pending',
  });

  return { url: `${siteConfig.siteUrl}/pay/${booking.payment_token}` };
}

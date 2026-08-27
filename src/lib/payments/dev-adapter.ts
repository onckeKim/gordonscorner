import 'server-only';
import type { CheckoutParams, CheckoutPayload, PaymentProvider, WebhookEvent } from './types';

/**
 * Development payment adapter. No external calls, no real money.
 * Renders a same-site "simulate payment" confirmation instead of a real
 * gateway, so the whole booking → deposit → confirmation flow can be
 * exercised end to end before live payment credentials exist.
 *
 * Used automatically when PAYMENT_PROVIDER=dev (the default) or when the
 * configured live provider is missing required credentials.
 */
export const devPaymentProvider: PaymentProvider = {
  name: 'dev',

  async buildCheckout(params: CheckoutParams): Promise<CheckoutPayload> {
    const url = new URL(`${new URL(params.returnUrl).origin}/pay/simulate`);
    url.searchParams.set('bookingId', params.booking.id);
    url.searchParams.set('type', params.type);
    url.searchParams.set('amount', params.amount.toFixed(2));
    url.searchParams.set('returnUrl', params.returnUrl);
    return { kind: 'redirect', url: url.toString() };
  },

  async parseWebhook(rawBody: string): Promise<WebhookEvent> {
    const data = JSON.parse(rawBody) as {
      bookingId: string;
      type: 'deposit' | 'balance';
      amount: number;
      outcome: 'paid' | 'failed';
    };
    return {
      verified: true,
      bookingId: data.bookingId,
      paymentType: data.type,
      status: data.outcome,
      providerReference: `DEV-${Date.now()}`,
      amount: data.amount,
      raw: data,
    };
  },
};

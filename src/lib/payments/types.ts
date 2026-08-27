import type { Booking, PaymentType } from '@/types/database';

/** What the /pay/[token] page needs to actually initiate checkout with a provider. */
export type CheckoutPayload =
  | { kind: 'redirect'; url: string }
  | { kind: 'form'; actionUrl: string; method: 'POST'; fields: Record<string, string> };

export interface CheckoutParams {
  booking: Booking;
  type: PaymentType;
  amount: number;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface WebhookEvent {
  /** True once signature/authenticity has been verified. */
  verified: boolean;
  bookingId: string;
  paymentType: PaymentType;
  status: 'paid' | 'failed' | 'cancelled';
  providerReference: string | null;
  amount: number | null;
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  name: string;
  /** Builds whatever the checkout page needs to hand the guest off to the provider. */
  buildCheckout(params: CheckoutParams): Promise<CheckoutPayload>;
  /** Parses + verifies an inbound webhook/ITN request body into a normalized event. */
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookEvent>;
}

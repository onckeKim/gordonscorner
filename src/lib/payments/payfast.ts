import 'server-only';
import crypto from 'crypto';
import type { CheckoutParams, CheckoutPayload, PaymentProvider, WebhookEvent } from './types';

/**
 * PayFast integration (South African payment gateway).
 *
 * PRODUCTION CHECKLIST before going live:
 *  1. Set PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE from
 *     your PayFast merchant dashboard (Settings > Integration).
 *  2. Set PAYFAST_MODE=live (defaults to sandbox otherwise).
 *  3. In the PayFast dashboard, confirm the notify_url (webhook) is reachable
 *     publicly — PayFast calls it server-to-server, so it must not require auth.
 *  4. Harden `parseWebhook` further per PayFast's ITN guide:
 *       - re-POST the received data back to PayFast's `validate` endpoint and
 *         confirm it responds "VALID" (protects against spoofed requests even
 *         if the signature matches);
 *       - restrict accepted source IPs to PayFast's published ranges.
 *     Signature verification alone (implemented below) is the minimum bar and
 *     is fine for staging, but do the extra hop before handling real money.
 */

function phpStyleUrlEncode(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

function buildSignatureBase(fields: Record<string, string>, passphrase?: string): string {
  const pairs = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${phpStyleUrlEncode(v)}`);

  let base = pairs.join('&');
  if (passphrase) {
    base += `&passphrase=${phpStyleUrlEncode(passphrase)}`;
  }
  return base;
}

function sign(fields: Record<string, string>, passphrase?: string): string {
  const base = buildSignatureBase(fields, passphrase);
  return crypto.createHash('md5').update(base).digest('hex');
}

function isLiveMode(): boolean {
  return process.env.PAYFAST_MODE === 'live';
}

function processUrl(): string {
  return isLiveMode() ? 'https://www.payfast.co.za/eng/process' : 'https://sandbox.payfast.co.za/eng/process';
}

export const payfastProvider: PaymentProvider = {
  name: 'payfast',

  async buildCheckout(params: CheckoutParams): Promise<CheckoutPayload> {
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE;

    if (!merchantId || !merchantKey) {
      throw new Error(
        'PayFast is not configured. Set PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY, ' +
          'or set PAYMENT_PROVIDER=dev for local development.',
      );
    }

    const [firstName] = params.booking.guest_name.split(' ');

    const fields: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      notify_url: params.notifyUrl,
      name_first: firstName || params.booking.guest_name,
      email_address: params.booking.guest_email,
      m_payment_id: `${params.booking.id}:${params.type}`,
      amount: params.amount.toFixed(2),
      item_name: `Gordon's Corner — ${params.type} (${params.booking.check_in} to ${params.booking.check_out})`,
      custom_str1: params.booking.id,
      custom_str2: params.type,
    };

    const signature = sign(fields, passphrase);

    return {
      kind: 'form',
      actionUrl: processUrl(),
      method: 'POST',
      fields: { ...fields, signature },
    };
  },

  async parseWebhook(rawBody: string, _headers: Headers): Promise<WebhookEvent> {
    const params = new URLSearchParams(rawBody);
    const data: Record<string, string> = {};
    params.forEach((value, key) => {
      data[key] = value;
    });

    const receivedSignature = data.signature ?? '';
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    const { signature: _sig, ...fieldsForVerification } = data;
    const expectedSignature = sign(fieldsForVerification, passphrase);
    const verified = receivedSignature.toLowerCase() === expectedSignature.toLowerCase();

    let bookingId = data.custom_str1 ?? '';
    let paymentType = (data.custom_str2 as 'deposit' | 'balance' | undefined) ?? undefined;
    if (!bookingId) {
      const [idFromPaymentId, typeFromPaymentId] = (data.m_payment_id ?? '').split(':');
      bookingId = idFromPaymentId ?? '';
      paymentType = (typeFromPaymentId as 'deposit' | 'balance' | undefined) ?? paymentType;
    }

    const payfastStatus = data.payment_status; // 'COMPLETE' | 'FAILED' | 'CANCELLED' | ...
    const status: WebhookEvent['status'] =
      payfastStatus === 'COMPLETE' ? 'paid' : payfastStatus === 'CANCELLED' ? 'cancelled' : 'failed';

    return {
      verified,
      bookingId,
      paymentType: paymentType ?? 'deposit',
      status,
      providerReference: data.pf_payment_id ?? null,
      amount: data.amount_gross ? Number(data.amount_gross) : null,
      raw: data,
    };
  },
};

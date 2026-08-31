import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import type { WebhookEvent } from '@/lib/payments/types';

/**
 * Exercises the payment webhook's two independent duplicate-delivery
 * defenses (see route.ts):
 *   1. An already-fully-processed provider_reference is recognised before
 *      any write is attempted (the common case — a provider retries a
 *      notification it already got a 200 for).
 *   2. A DB unique-constraint violation on insert is treated as "lost a
 *      race with a concurrent duplicate delivery", not a failure — this is
 *      the last line of defense against two deliveries arriving at once.
 * Also covers the ordinary happy path (deposit paid -> booking confirmed,
 * receipt sent) so the duplicate-suppressing branches are shown NOT to
 * fire when they shouldn't.
 *
 * The Supabase client is faked with a per-table response queue: each
 * `db.from(table)` call consumes the next canned {data, error} configured
 * for that table, in the exact order the route code is known to query it.
 * This intentionally doesn't simulate real WHERE-clause filtering — it
 * verifies the route's *branching logic* against controlled DB responses,
 * not the database itself (that's the job of the EXCLUDE/UNIQUE
 * constraints and a real integration test against Postgres).
 */

const markDepositPaid = vi.fn();
const markDepositFailed = vi.fn();
const markBalancePaidViaPayment = vi.fn();

vi.mock('@/lib/booking/workflow', () => {
  class WorkflowError extends Error {}
  return {
    WorkflowError,
    markDepositPaid: (...args: unknown[]) => markDepositPaid(...args),
    markDepositFailed: (...args: unknown[]) => markDepositFailed(...args),
    markBalancePaidViaPayment: (...args: unknown[]) => markBalancePaidViaPayment(...args),
  };
});

const sendReceiptEmail = vi.fn();
const sendPaymentFailedEmail = vi.fn();
vi.mock('@/lib/email', () => ({
  sendReceiptEmail: (...args: unknown[]) => sendReceiptEmail(...args),
  sendPaymentFailedEmail: (...args: unknown[]) => sendPaymentFailedEmail(...args),
}));

const parseWebhook = vi.fn();
vi.mock('@/lib/payments', () => ({
  getPaymentProvider: () => ({ name: 'dev', parseWebhook: (...args: unknown[]) => parseWebhook(...args) }),
}));

interface CannedResult {
  data: unknown;
  error: unknown;
}

function makeChain(result: CannedResult) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    update: () => chain,
    insert: () => chain,
    single: async () => result,
    maybeSingle: async () => result,
    then: (resolve: (v: CannedResult) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function createQueueDb(queues: Record<string, CannedResult[]>) {
  return {
    from: (table: string) => {
      const queue = queues[table];
      const result = queue && queue.length > 0 ? queue.shift()! : { data: null, error: null };
      return makeChain(result);
    },
  };
}

let dbQueues: Record<string, CannedResult[]>;

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: () => createQueueDb(dbQueues),
}));

function fakeRequest(body = 'raw-webhook-body'): NextRequest {
  return {
    text: async () => body,
    headers: new Headers(),
  } as unknown as NextRequest;
}

function baseEvent(overrides: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    verified: true,
    bookingId: 'booking-1',
    paymentType: 'deposit',
    status: 'paid',
    providerReference: 'PF-REF-1',
    amount: 925,
    idempotencyKey: null,
    raw: {},
    ...overrides,
  };
}

describe('payment webhook duplicate delivery handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbQueues = {};
  });

  it('acknowledges an already-fully-processed provider_reference without reapplying anything', async () => {
    const { POST } = await import('./route');
    parseWebhook.mockResolvedValue(baseEvent());
    dbQueues = {
      // The idempotency lookup finds a payment already in a terminal state.
      payments: [{ data: { id: 'pay-existing', status: 'paid' }, error: null }],
    };

    const res = await POST(fakeRequest());
    const json = await res.json();

    expect(json).toEqual({ ok: true, duplicate: true });
    expect(markDepositPaid).not.toHaveBeenCalled();
    expect(markBalancePaidViaPayment).not.toHaveBeenCalled();
    expect(sendReceiptEmail).not.toHaveBeenCalled();
  });

  it('treats a unique-constraint violation on insert as a safe duplicate (concurrent race)', async () => {
    const { POST } = await import('./route');
    parseWebhook.mockResolvedValue(baseEvent({ providerReference: 'PF-REF-2', bookingId: 'booking-2' }));
    dbQueues = {
      payments: [
        { data: null, error: null }, // no already-recorded payment for this reference
        { data: [], error: null }, // no existing pending/processing attempt to update
        {
          data: null,
          error: { code: '23505', message: 'duplicate key value violates unique constraint' },
        }, // insert loses the race to a concurrent delivery
      ],
      bookings: [
        {
          data: { id: 'booking-2', deposit_amount: 925, balance_amount: 925, admin_notes: null, payment_token: 'tok' },
          error: null,
        },
      ],
    };

    const res = await POST(fakeRequest());
    const json = await res.json();

    expect(json).toEqual({ ok: true, duplicate: true });
    expect(markDepositPaid).not.toHaveBeenCalled();
  });

  it('confirms the booking and sends exactly one receipt on a genuine first-time paid deposit', async () => {
    const { POST } = await import('./route');
    parseWebhook.mockResolvedValue(baseEvent({ providerReference: 'PF-REF-3', bookingId: 'booking-3' }));
    markDepositPaid.mockResolvedValue({ id: 'booking-3', status: 'accepted_deposit_paid' });
    dbQueues = {
      payments: [
        { data: null, error: null }, // not already recorded
        { data: [], error: null }, // no existing attempt row
        { data: { id: 'pay-new' }, error: null }, // insert succeeds
        { data: { id: 'pay-new', amount: 925, type: 'deposit' }, error: null }, // re-fetch for the receipt email
      ],
      bookings: [
        {
          data: { id: 'booking-3', deposit_amount: 925, balance_amount: 925, admin_notes: null, payment_token: 'tok' },
          error: null,
        },
      ],
    };

    const res = await POST(fakeRequest());
    const json = await res.json();

    expect(json).toEqual({ ok: true });
    expect(markDepositPaid).toHaveBeenCalledTimes(1);
    expect(markDepositPaid).toHaveBeenCalledWith('booking-3');
    expect(sendReceiptEmail).toHaveBeenCalledTimes(1);
  });

  it('rejects a webhook that fails signature verification without touching the booking', async () => {
    const { POST } = await import('./route');
    parseWebhook.mockResolvedValue(baseEvent({ verified: false }));
    dbQueues = {};

    const res = await POST(fakeRequest());
    expect(res.status).toBe(400);
    expect(markDepositPaid).not.toHaveBeenCalled();
  });
});

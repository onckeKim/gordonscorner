'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function SimulateContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId') ?? '';
  const type = searchParams.get('type') ?? 'deposit';
  const amount = searchParams.get('amount') ?? '0';
  const returnUrl = searchParams.get('returnUrl') ?? '/';
  const [busy, setBusy] = useState(false);

  async function simulate(outcome: 'paid' | 'failed') {
    setBusy(true);
    await fetch('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, type, amount: Number(amount), outcome }),
    });
    const url = new URL(returnUrl);
    url.searchParams.set('outcome', outcome === 'paid' ? 'success' : 'cancelled');
    window.location.href = url.toString();
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <div className="mb-6 rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-900">
        DEV PAYMENT SIMULATOR — no real payment provider is configured. Set PAYMENT_PROVIDER and
        its credentials to use a live gateway.
      </div>
      <h1 className="font-display text-2xl font-semibold">Simulate payment</h1>
      <p className="mt-2 text-sm text-corner-muted">
        {type === 'deposit' ? 'Deposit' : 'Balance'} amount: R{amount}
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <button disabled={busy} onClick={() => simulate('paid')} className="btn-primary">
          Simulate successful payment
        </button>
        <button disabled={busy} onClick={() => simulate('failed')} className="btn-secondary">
          Simulate failed payment
        </button>
      </div>
    </div>
  );
}

export default function SimulatePaymentPage() {
  return (
    <Suspense>
      <SimulateContent />
    </Suspense>
  );
}

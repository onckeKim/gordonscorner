'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Payment } from '@/types/database';

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function viewProof(paymentId: string) {
  const res = await fetch(`/api/payments/${paymentId}/proof`);
  const data = await res.json();
  if (res.ok && data.url) {
    window.open(data.url, '_blank', 'noopener');
  }
}

function NoteEditor({ payment, onSaved }: { payment: Payment; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(payment.admin_note ?? '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/payments/${payment.id}/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    setBusy(false);
    setEditing(false);
    onSaved();
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-left text-corner-muted hover:text-corner-charcoal">
        {payment.admin_note || <span className="italic">Add note</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        className="input py-1 text-xs"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        autoFocus
      />
      <button type="button" disabled={busy} onClick={save} className="text-xs text-corner-gold">
        Save
      </button>
    </div>
  );
}

export function PaymentsPanel({ bookingId, payments }: { bookingId: string; payments: Payment[] }) {
  const router = useRouter();
  const [showManual, setShowManual] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [manualType, setManualType] = useState<'deposit' | 'balance'>('deposit');
  const [manualAmount, setManualAmount] = useState('');
  const [manualReference, setManualReference] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const [refundAmount, setRefundAmount] = useState('');
  const [refundSourceId, setRefundSourceId] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const paidPayments = payments.filter((p) => p.status === 'paid' || p.status === 'partially_refunded');

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('type', manualType);
      formData.set('amount', manualAmount);
      if (manualReference) formData.set('reference', manualReference);
      if (manualNote) formData.set('note', manualNote);
      if (proofFile) formData.set('proof', proofFile);

      const res = await fetch(`/api/bookings/${bookingId}/payments/manual`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not record payment.');

      setShowManual(false);
      setManualAmount('');
      setManualReference('');
      setManualNote('');
      setProofFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function submitRefund(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/payments/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(refundAmount),
          sourcePaymentId: refundSourceId || undefined,
          reason: refundReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not record refund.');

      setShowRefund(false);
      setRefundAmount('');
      setRefundSourceId('');
      setRefundReason('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold">Payments</h2>
        <a
          href={`/api/admin/payments/export?bookingId=${bookingId}`}
          className="text-xs text-corner-gold underline hover:no-underline"
        >
          Download payments CSV
        </a>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-corner-muted">
            <tr>
              <th className="py-1.5 pr-3">Type</th>
              <th className="py-1.5 pr-3">Amount</th>
              <th className="py-1.5 pr-3">Status</th>
              <th className="py-1.5 pr-3">Reference</th>
              <th className="py-1.5 pr-3">Date</th>
              <th className="py-1.5 pr-3">Proof</th>
              <th className="py-1.5">Note</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-corner-stone align-top">
                <td className="py-1.5 pr-3 capitalize">{p.type}</td>
                <td className="py-1.5 pr-3">
                  {formatZar(p.amount)}
                  {p.refunded_amount > 0 && (
                    <p className="text-xs text-corner-muted">{formatZar(p.refunded_amount)} refunded</p>
                  )}
                </td>
                <td className="py-1.5 pr-3 capitalize">{p.status.replace(/_/g, ' ')}</td>
                <td className="py-1.5 pr-3 text-corner-muted">{p.provider_reference ?? '—'}</td>
                <td className="py-1.5 pr-3 text-corner-muted">{formatDateTime(p.paid_at ?? p.created_at)}</td>
                <td className="py-1.5 pr-3">
                  {p.proof_of_payment_url ? (
                    <button type="button" onClick={() => viewProof(p.id)} className="text-corner-gold underline hover:no-underline">
                      View
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="py-1.5">
                  <NoteEditor payment={p} onSaved={() => router.refresh()} />
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="py-3 text-corner-muted">
                  No payment attempts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-3 text-sm text-corner-error">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-corner-stone pt-4">
        <button type="button" onClick={() => setShowManual((s) => !s)} className="btn-secondary text-xs">
          Record manual payment
        </button>
        <button type="button" onClick={() => setShowRefund((s) => !s)} className="btn-secondary text-xs">
          Issue refund
        </button>
      </div>

      {showManual && (
        <form onSubmit={submitManual} className="mt-4 space-y-3 rounded-lg border border-corner-stone p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="manualType">Type</label>
              <select
                id="manualType"
                className="input"
                value={manualType}
                onChange={(e) => setManualType(e.target.value as 'deposit' | 'balance')}
              >
                <option value="deposit">Deposit</option>
                <option value="balance">Balance</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="manualAmount">Amount (ZAR)</label>
              <input
                id="manualAmount"
                type="number"
                step="0.01"
                min="0.01"
                required
                className="input"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="manualReference">Reference (optional)</label>
            <input
              id="manualReference"
              className="input"
              placeholder="EFT reference, receipt number, ..."
              value={manualReference}
              onChange={(e) => setManualReference(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="manualNote">Note (optional)</label>
            <input
              id="manualNote"
              className="input"
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="proofFile">Proof of payment (optional — JPEG, PNG, WebP or PDF, max 10MB)</label>
            <input
              id="proofFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="input"
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Recording…' : 'Record payment'}
          </button>
        </form>
      )}

      {showRefund && (
        <form onSubmit={submitRefund} className="mt-4 space-y-3 rounded-lg border border-corner-stone p-4">
          <div>
            <label className="label" htmlFor="refundAmount">Refund amount (ZAR)</label>
            <input
              id="refundAmount"
              type="number"
              step="0.01"
              min="0.01"
              required
              className="input"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="refundSource">Against payment (optional)</label>
            <select
              id="refundSource"
              className="input"
              value={refundSourceId}
              onChange={(e) => setRefundSourceId(e.target.value)}
            >
              <option value="">Not linked to a specific payment</option>
              {paidPayments.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.type} — {formatZar(p.amount)} ({formatDateTime(p.paid_at ?? p.created_at)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="refundReason">Reason (optional)</label>
            <input
              id="refundReason"
              className="input"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
          </div>
          <p className="text-xs text-corner-muted">
            This records the refund for your books — process the actual refund with your payment
            provider directly first, then record it here.
          </p>
          <button type="submit" disabled={busy} className="w-full rounded-full bg-corner-error px-7 py-3 text-sm font-medium text-white hover:opacity-90">
            {busy ? 'Recording…' : 'Record refund'}
          </button>
        </form>
      )}
    </div>
  );
}

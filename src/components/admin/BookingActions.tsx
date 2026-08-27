'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Booking } from '@/types/database';

async function callAction(url: string, body?: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? 'Action failed.');
  }
  return data;
}

const REVIEW_STATUSES: Booking['status'][] = ['submitted', 'under_review', 'information_required', 'alternative_dates_proposed'];
const NO_FURTHER_ACTION_STATUSES: Booking['status'][] = ['declined', 'expired', 'cancelled', 'checked_out', 'no_show', 'draft'];

export function BookingActions({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [declineReason, setDeclineReason] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [proposedCheckIn, setProposedCheckIn] = useState('');
  const [proposedCheckOut, setProposedCheckOut] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showPropose, setShowPropose] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
      setShowDecline(false);
      setShowInfo(false);
      setShowPropose(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const base = `/api/bookings/${booking.id}`;

  return (
    <div className="card space-y-4">
      <h2 className="font-display text-lg font-semibold">Actions</h2>
      {error && <p className="text-sm text-corner-error">{error}</p>}

      {REVIEW_STATUSES.includes(booking.status) && booking.status !== 'alternative_dates_proposed' && (
        <>
          <button
            disabled={busy}
            onClick={() => run(() => callAction(`${base}/accept`))}
            className="btn-primary w-full"
          >
            Accept & send deposit link
          </button>

          <button
            disabled={busy}
            onClick={() => setShowInfo((s) => !s)}
            className="btn-secondary w-full"
          >
            Request more information
          </button>
          {showInfo && (
            <div className="space-y-2">
              <textarea
                className="input"
                rows={3}
                placeholder="What do you need from the guest?"
                value={infoMessage}
                onChange={(e) => setInfoMessage(e.target.value)}
              />
              <button
                disabled={busy || !infoMessage.trim()}
                onClick={() => run(() => callAction(`${base}/request-info`, { message: infoMessage }))}
                className="btn-primary w-full"
              >
                Send request
              </button>
            </div>
          )}

          <button
            disabled={busy}
            onClick={() => setShowPropose((s) => !s)}
            className="btn-secondary w-full"
          >
            Propose alternative dates
          </button>
          {showPropose && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  className="input"
                  value={proposedCheckIn}
                  onChange={(e) => setProposedCheckIn(e.target.value)}
                />
                <input
                  type="date"
                  className="input"
                  value={proposedCheckOut}
                  onChange={(e) => setProposedCheckOut(e.target.value)}
                />
              </div>
              <button
                disabled={busy || !proposedCheckIn || !proposedCheckOut}
                onClick={() =>
                  run(() =>
                    callAction(`${base}/propose-dates`, { proposedCheckIn, proposedCheckOut }),
                  )
                }
                className="btn-primary w-full"
              >
                Send proposal
              </button>
            </div>
          )}

          <button
            disabled={busy}
            onClick={() => setShowDecline((s) => !s)}
            className="w-full text-sm text-corner-error hover:underline"
          >
            Decline request
          </button>
          {showDecline && (
            <div className="space-y-2">
              <textarea
                className="input"
                rows={2}
                placeholder="Reason (shared with guest, optional)"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
              <button
                disabled={busy}
                onClick={() => run(() => callAction(`${base}/decline`, { reason: declineReason }))}
                className="w-full rounded-full bg-corner-error px-7 py-3 text-sm font-medium text-white hover:opacity-90"
              >
                Confirm decline
              </button>
            </div>
          )}
        </>
      )}

      {(booking.status === 'accepted_awaiting_deposit' || booking.status === 'deposit_processing') && (
        <>
          <p className="text-sm text-corner-muted">
            {booking.status === 'deposit_processing'
              ? 'The guest has been sent to the payment provider to pay their deposit.'
              : 'Waiting on the guest to pay their deposit.'}{' '}
            Dates are held until{' '}
            {booking.hold_expires_at
              ? new Date(booking.hold_expires_at).toLocaleString('en-ZA')
              : '—'}
            .
          </p>
          <button
            disabled={busy}
            onClick={() => run(() => callAction(`${base}/cancel`))}
            className="btn-secondary w-full"
          >
            Cancel & release dates
          </button>
        </>
      )}

      {booking.status === 'confirmed' && (
        <>
          {booking.balance_paid_at ? (
            <p className="text-sm text-corner-success">Balance paid.</p>
          ) : (
            <>
              <button
                disabled={busy}
                onClick={() => run(() => callAction(`${base}/mark-balance-paid`))}
                className="btn-primary w-full"
              >
                Mark balance as paid
              </button>
              <button
                disabled={busy}
                onClick={() => run(() => callAction(`${base}/send-balance-link`))}
                className="btn-secondary w-full"
              >
                Email balance payment link
              </button>
            </>
          )}
          <button
            disabled={busy}
            onClick={() => run(() => callAction(`${base}/check-in`))}
            className="btn-secondary w-full"
          >
            Mark as checked in
          </button>
          <button
            disabled={busy}
            onClick={() => run(() => callAction(`${base}/no-show`))}
            className="w-full text-sm text-corner-error hover:underline"
          >
            Mark as no-show
          </button>
          <button
            disabled={busy}
            onClick={() => run(() => callAction(`${base}/cancel`))}
            className="w-full text-sm text-corner-error hover:underline"
          >
            Cancel booking
          </button>
        </>
      )}

      {booking.status === 'checked_in' && (
        <>
          {booking.balance_paid_at ? (
            <p className="text-sm text-corner-success">Balance paid.</p>
          ) : (
            <button
              disabled={busy}
              onClick={() => run(() => callAction(`${base}/mark-balance-paid`))}
              className="btn-primary w-full"
            >
              Mark balance as paid
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => run(() => callAction(`${base}/check-out`))}
            className="btn-secondary w-full"
          >
            Mark as checked out
          </button>
        </>
      )}

      {booking.status === 'alternative_dates_proposed' && (
        <p className="text-sm text-corner-muted">
          Waiting on the guest to accept or decline the proposed dates.
        </p>
      )}

      {NO_FURTHER_ACTION_STATUSES.includes(booking.status) && (
        <p className="text-sm text-corner-muted">No further action needed.</p>
      )}
    </div>
  );
}

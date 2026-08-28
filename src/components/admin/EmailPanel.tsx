'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { EmailLogEntry } from '@/types/database';
import { RESENDABLE_EMAIL_TYPES, type ResendableEmailType } from '@/lib/booking/resendable-email-types';

const LABELS: Record<ResendableEmailType, string> = {
  booking_received: 'Booking request received',
  booking_accepted: 'Booking accepted (notice)',
  booking_declined: 'Booking declined',
  booking_cancelled: 'Booking cancelled',
  booking_confirmed: 'Booking confirmed',
  pre_arrival: 'Pre-arrival information',
  check_in_instructions: 'Check-in instructions',
  check_out_reminder: 'Check-out reminder',
  post_stay_thank_you: 'Post-stay thank-you',
  review_request: 'Review request',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EmailPanel({ bookingId, history }: { bookingId: string; history: EmailLogEntry[] }) {
  const router = useRouter();
  const [emailType, setEmailType] = useState<ResendableEmailType>('booking_confirmed');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function resend() {
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/resend-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not send.');
      setSent(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold">Emails</h2>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select className="input w-auto py-1.5 text-xs" value={emailType} onChange={(e) => setEmailType(e.target.value as ResendableEmailType)}>
          {RESENDABLE_EMAIL_TYPES.map((t) => (
            <option key={t} value={t}>
              {LABELS[t]}
            </option>
          ))}
        </select>
        <button type="button" disabled={busy} onClick={resend} className="btn-secondary text-xs">
          {busy ? 'Sending…' : 'Send'}
        </button>
        {sent && <span className="text-xs text-corner-success">Sent</span>}
        {error && <span className="text-xs text-corner-error">{error}</span>}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="uppercase text-corner-muted">
            <tr>
              <th className="py-1.5 pr-3">Type</th>
              <th className="py-1.5 pr-3">Recipient</th>
              <th className="py-1.5 pr-3">Status</th>
              <th className="py-1.5">Sent</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-t border-corner-stone">
                <td className="py-1.5 pr-3">{h.email_type.replace(/_/g, ' ')}</td>
                <td className="py-1.5 pr-3 text-corner-muted">{h.recipient}</td>
                <td className={`py-1.5 pr-3 ${h.status === 'failed' ? 'text-corner-error' : 'text-corner-success'}`} title={h.failure_reason ?? undefined}>
                  {h.status}
                </td>
                <td className="py-1.5 text-corner-muted">{formatDateTime(h.sent_at)}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-corner-muted">
                  No emails logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

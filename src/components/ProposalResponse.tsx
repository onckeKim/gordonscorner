'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ProposalResponse({
  bookingId,
  proposedCheckIn,
  proposedCheckOut,
}: {
  bookingId: string;
  proposedCheckIn: string;
  proposedCheckOut: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: 'accept' | 'decline') {
    setSubmitting(action);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/respond-to-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Could not submit your response.');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(null);
    }
  }

  return (
    <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">We&rsquo;ve proposed alternative dates:</p>
      <p className="mt-1">
        {formatDate(proposedCheckIn)} &rarr; {formatDate(proposedCheckOut)}
      </p>
      {error && <p className="mt-2 text-corner-danger">{error}</p>}
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          disabled={submitting !== null}
          onClick={() => respond('accept')}
          className="btn-primary px-5 py-2 text-xs"
        >
          {submitting === 'accept' ? 'Accepting…' : 'Accept these dates'}
        </button>
        <button
          type="button"
          disabled={submitting !== null}
          onClick={() => respond('decline')}
          className="btn-secondary px-5 py-2 text-xs"
        >
          {submitting === 'decline' ? 'Declining…' : 'Decline'}
        </button>
      </div>
    </div>
  );
}

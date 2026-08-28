'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GuestCommunication, GuestCommunicationChannel } from '@/types/database';

const CHANNELS: GuestCommunicationChannel[] = ['email', 'phone', 'whatsapp', 'sms', 'in_person', 'other'];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CommunicationLog({ bookingId, communications }: { bookingId: string; communications: GuestCommunication[] }) {
  const router = useRouter();
  const [channel, setChannel] = useState<GuestCommunicationChannel>('email');
  const [direction, setDirection] = useState<'outbound' | 'inbound'>('outbound');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, direction, summary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save.');
      setSummary('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold">Guest communication</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {communications.map((c) => (
          <li key={c.id} className="border-t border-corner-stone pt-2 first:border-t-0 first:pt-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium capitalize text-corner-charcoal">
                {c.channel.replace(/_/g, ' ')} &middot; {c.direction}
              </span>
              <span className="text-xs text-corner-muted">{formatDateTime(c.created_at)}</span>
            </div>
            <p className="mt-1 text-corner-muted">{c.summary}</p>
          </li>
        ))}
        {communications.length === 0 && <p className="text-corner-muted">No communication logged yet.</p>}
      </ul>

      <form onSubmit={submit} className="mt-4 space-y-2 border-t border-corner-stone pt-4">
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={channel} onChange={(e) => setChannel(e.target.value as GuestCommunicationChannel)}>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <select className="input" value={direction} onChange={(e) => setDirection(e.target.value as 'outbound' | 'inbound')}>
            <option value="outbound">Outbound (we contacted guest)</option>
            <option value="inbound">Inbound (guest contacted us)</option>
          </select>
        </div>
        <textarea
          className="input"
          rows={2}
          required
          placeholder="What was discussed?"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        {error && <p className="text-sm text-corner-error">{error}</p>}
        <button type="submit" disabled={busy || !summary.trim()} className="btn-secondary text-xs">
          {busy ? 'Saving…' : 'Log communication'}
        </button>
      </form>
    </div>
  );
}

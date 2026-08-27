'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BlockDatesForm() {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/blocked-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not block dates.');
      setStartDate('');
      setEndDate('');
      setReason('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-3">
      <h2 className="font-display text-lg font-semibold">Block dates manually</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="startDate">
            From
          </label>
          <input
            id="startDate"
            type="date"
            required
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="endDate">
            To
          </label>
          <input
            id="endDate"
            type="date"
            required
            className="input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="reason">
          Reason (optional)
        </label>
        <input
          id="reason"
          className="input"
          placeholder="Maintenance, personal use, etc."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-corner-danger">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Blocking…' : 'Block dates'}
      </button>
    </form>
  );
}

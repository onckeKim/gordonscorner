'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DateRateOverride } from '@/types/database';

function formatZar(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount);
}

export function RateOverridesPanel({
  overrides,
  weekendRate,
  currency,
}: {
  overrides: DateRateOverride[];
  weekendRate: number | null;
  currency: string;
}) {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [label, setLabel] = useState('');
  const [nightlyRate, setNightlyRate] = useState('');
  const [minNights, setMinNights] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [weekendInput, setWeekendInput] = useState(weekendRate != null ? String(weekendRate) : '');
  const [weekendBusy, setWeekendBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/rate-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          label: label || undefined,
          nightlyRate: nightlyRate ? Number(nightlyRate) : undefined,
          minNights: minNights ? Number(minNights) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save.');
      setStartDate('');
      setEndDate('');
      setLabel('');
      setNightlyRate('');
      setMinNights('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    await fetch(`/api/admin/rate-overrides/${id}`, { method: 'DELETE' });
    router.refresh();
    setBusyId(null);
  }

  async function saveWeekendRate(e: React.FormEvent) {
    e.preventDefault();
    setWeekendBusy(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekend_nightly_rate: weekendInput ? Number(weekendInput) : null }),
      });
      router.refresh();
    } finally {
      setWeekendBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold">Seasonal &amp; date-specific rates</h2>
      <p className="mt-1 text-xs text-corner-muted">
        The earliest-created range covering a date wins. Set a nightly rate, a minimum-stay rule, or both.
      </p>

      <ul className="mt-3 space-y-2 text-sm">
        {overrides.map((o) => (
          <li key={o.id} className="flex items-center justify-between border-t border-corner-stone pt-2 first:border-t-0 first:pt-0">
            <span>
              {o.start_date} &rarr; {o.end_date}
              {o.label ? <span className="text-corner-muted"> — {o.label}</span> : null}
              {o.nightly_rate != null && <span className="ml-2 font-medium">{formatZar(o.nightly_rate, currency)}/night</span>}
              {o.min_nights != null && <span className="ml-2 text-corner-muted">min {o.min_nights} nights</span>}
            </span>
            <button disabled={busyId === o.id} onClick={() => remove(o.id)} className="text-xs text-corner-danger hover:underline">
              Remove
            </button>
          </li>
        ))}
        {overrides.length === 0 && <p className="text-corner-muted">No seasonal rates or minimum-stay rules set.</p>}
      </ul>

      <form onSubmit={submit} className="mt-4 space-y-2 border-t border-corner-stone pt-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="roStart">From</label>
            <input id="roStart" type="date" required className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="roEnd">To</label>
            <input id="roEnd" type="date" required className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="roLabel">Label</label>
          <input id="roLabel" className="input" placeholder="Peak season, Festive period, ..." value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label" htmlFor="roRate">Nightly rate ({currency}, optional)</label>
            <input id="roRate" type="number" min="0" step="0.01" className="input" value={nightlyRate} onChange={(e) => setNightlyRate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="roMinNights">Minimum nights (optional)</label>
            <input id="roMinNights" type="number" min="1" className="input" value={minNights} onChange={(e) => setMinNights(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-corner-error">{error}</p>}
        <button type="submit" disabled={busy} className="btn-secondary text-xs">
          {busy ? 'Saving…' : 'Add rate rule'}
        </button>
      </form>

      <form onSubmit={saveWeekendRate} className="mt-4 flex items-end gap-2 border-t border-corner-stone pt-4">
        <div className="flex-1">
          <label className="label" htmlFor="weekendRate">Weekend rate (Fri/Sat nights, {currency})</label>
          <input
            id="weekendRate"
            type="number"
            min="0"
            step="0.01"
            className="input"
            placeholder="Leave blank to charge the standard rate on weekends"
            value={weekendInput}
            onChange={(e) => setWeekendInput(e.target.value)}
          />
        </div>
        <button type="submit" disabled={weekendBusy} className="btn-secondary text-xs">
          {weekendBusy ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}

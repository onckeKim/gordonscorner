'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function InternalNotes({ bookingId, notes }: { bookingId: string; notes: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save.');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold">Internal notes</h2>
      <p className="text-xs text-corner-muted">Private — never shown to the guest.</p>
      <textarea
        className="input mt-3"
        rows={4}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
      />
      {error && <p className="mt-1 text-sm text-corner-error">{error}</p>}
      <div className="mt-2 flex items-center gap-3">
        <button type="button" disabled={busy} onClick={save} className="btn-secondary text-xs">
          {busy ? 'Saving…' : 'Save notes'}
        </button>
        {saved && <span className="text-xs text-corner-success">Saved</span>}
      </div>
    </div>
  );
}

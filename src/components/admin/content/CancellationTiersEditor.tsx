'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CancellationPolicySection, CancellationTier } from '@/lib/content/sections';

/**
 * Configurable cancellation tiers — deliberately structured data (days
 * before check-in -> refund %), not a hardcoded percentage baked into
 * prose, so an admin can change the refund schedule without editing code.
 */
export function CancellationTiersEditor({ section }: { section: CancellationPolicySection }) {
  const router = useRouter();
  const [tiers, setTiers] = useState<CancellationTier[]>(section.tiers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateTier(i: number, field: keyof CancellationTier, value: string) {
    setTiers((ts) =>
      ts.map((t, idx) =>
        idx !== i
          ? t
          : {
              ...t,
              [field]: field === 'minDaysBeforeCheckIn' || field === 'refundPercent' ? Number(value) : value,
            },
      ),
    );
  }

  async function onSave() {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/content/cancellationPolicy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: { ...section, tiers } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save.');
      setSaved(true);
      setError(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="label">Cancellation tiers</p>
      <p className="mt-1 text-xs text-corner-muted">
        Checked in order — put the most generous (highest days-before) tier first.
      </p>
      <div className="mt-2 space-y-2">
        {tiers.map((tier, i) => (
          <div key={tier.id} className="grid grid-cols-[1fr,auto,auto] items-end gap-2 rounded-lg border border-corner-stone p-2">
            <div>
              <label className="label">Label</label>
              <input className="input" value={tier.label} onChange={(e) => updateTier(i, 'label', e.target.value)} />
            </div>
            <div>
              <label className="label">Min days before check-in</label>
              <input
                type="number"
                min={0}
                className="input w-28"
                value={tier.minDaysBeforeCheckIn}
                onChange={(e) => updateTier(i, 'minDaysBeforeCheckIn', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Refund %</label>
              <input
                type="number"
                min={0}
                max={100}
                className="input w-24"
                value={tier.refundPercent}
                onChange={(e) => updateTier(i, 'refundPercent', e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => setTiers((ts) => ts.filter((_, idx) => idx !== i))}
              className="col-span-3 justify-self-start text-xs text-corner-danger hover:underline"
            >
              Remove tier
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setTiers((ts) => [...ts, { id: `tier-${Date.now()}`, label: '', minDaysBeforeCheckIn: 0, refundPercent: 0 }])}
        className="mt-2 text-xs text-corner-gold hover:underline"
      >
        + Add tier
      </button>
      {error && <p className="mt-2 text-sm text-corner-error">{error}</p>}
      <div className="mt-2 flex items-center gap-3">
        <button type="button" disabled={busy} onClick={onSave} className="btn-secondary text-xs">
          {busy ? 'Saving…' : 'Save tiers'}
        </button>
        {saved && <span className="text-xs text-corner-success">Saved</span>}
      </div>
    </div>
  );
}

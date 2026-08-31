'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Redirect, RedirectStatusCode } from '@/types/database';

const EMPTY_FORM = { from_path: '', to_path: '', status_code: 308 as RedirectStatusCode };

export function RedirectsPanel({ redirects }: { redirects: Redirect[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/seo/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not create this redirect.');
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch('/api/admin/seo/redirects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold">Redirects</h2>
      <p className="mt-1 text-xs text-corner-muted">
        Checked on every request before routing — use this instead of leaving a broken link when a
        page moves or is renamed.
      </p>

      {redirects.length > 0 && (
        <ul className="mt-4 divide-y divide-corner-border text-sm">
          {redirects.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2">
              <p>
                <span className="font-medium">{r.from_path}</span>
                <span className="text-corner-muted"> → {r.to_path}</span>{' '}
                <span className="text-xs text-corner-muted">({r.status_code})</span>
              </p>
              <button type="button" disabled={busy} onClick={() => remove(r.id)} className="text-xs text-corner-danger hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-corner-border pt-4">
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="/old-path" value={form.from_path} onChange={(e) => setForm((f) => ({ ...f, from_path: e.target.value }))} />
          <input className="input" placeholder="/new-path or https://…" value={form.to_path} onChange={(e) => setForm((f) => ({ ...f, to_path: e.target.value }))} />
        </div>
        <div>
          <label className="label" htmlFor="status_code">Status code</label>
          <select
            id="status_code"
            className="input"
            value={form.status_code}
            onChange={(e) => setForm((f) => ({ ...f, status_code: Number(e.target.value) as RedirectStatusCode }))}
          >
            <option value={308}>308 — Permanent (preserves method)</option>
            <option value={301}>301 — Permanent</option>
            <option value={307}>307 — Temporary (preserves method)</option>
            <option value={302}>302 — Temporary</option>
          </select>
        </div>
        {error && <p className="text-sm text-corner-error">{error}</p>}
        <button type="submit" disabled={busy} className="btn-secondary">
          {busy ? 'Saving…' : 'Add redirect'}
        </button>
      </form>
    </div>
  );
}

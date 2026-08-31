'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PageSeoOverride } from '@/types/database';

const EMPTY_FORM = { path: '', title: '', description: '', canonical_path: '', og_image_url: '', noindex: false };

export function PageSeoOverridesPanel({ overrides }: { overrides: PageSeoOverride[] }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.path.startsWith('/')) {
      setError('Path must start with /, e.g. /accommodation');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/seo/page-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save this override.');
      setForm(EMPTY_FORM);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(path: string) {
    setBusy(true);
    await fetch('/api/admin/seo/page-overrides', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold">Per-page overrides</h2>
      <p className="mt-1 text-xs text-corner-muted">
        Override any public page&rsquo;s title, description, canonical URL, OG image, or remove it
        from search indexing — without a redeploy. Leave a field blank to keep that page&rsquo;s
        coded default.
      </p>

      {overrides.length > 0 && (
        <ul className="mt-4 divide-y divide-corner-border text-sm">
          {overrides.map((o) => (
            <li key={o.path} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="font-medium">{o.path}</p>
                <p className="text-xs text-corner-muted">
                  {o.title || '—'} {o.noindex && <span className="text-corner-error">· noindex</span>}
                </p>
              </div>
              <button type="button" disabled={busy} onClick={() => remove(o.path)} className="text-xs text-corner-danger hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-3 border-t border-corner-border pt-4">
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="/path" value={form.path} onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))} />
          <input className="input" placeholder="Title override" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <input className="input" placeholder="Description override" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Canonical path (optional)" value={form.canonical_path} onChange={(e) => setForm((f) => ({ ...f, canonical_path: e.target.value }))} />
          <input className="input" placeholder="OG image URL (optional)" value={form.og_image_url} onChange={(e) => setForm((f) => ({ ...f, og_image_url: e.target.value }))} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.noindex} onChange={(e) => setForm((f) => ({ ...f, noindex: e.target.checked }))} />
          Exclude this page from search indexing (noindex)
        </label>
        {error && <p className="text-sm text-corner-error">{error}</p>}
        <button type="submit" disabled={busy} className="btn-secondary">
          {busy ? 'Saving…' : 'Save override'}
        </button>
      </form>
    </div>
  );
}

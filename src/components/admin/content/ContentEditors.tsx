'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

async function saveSection(key: string, value: unknown): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/admin/content/${key}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  const data = await res.json();
  return res.ok ? { ok: true } : { ok: false, error: data.error ?? 'Could not save.' };
}

function SaveBar({ busy, error, saved, onSave, label = 'Save' }: { busy: boolean; error: string | null; saved: boolean; onSave: () => void; label?: string }) {
  return (
    <div className="mt-3 flex items-center gap-3">
      <button type="button" disabled={busy} onClick={onSave} className="btn-secondary text-xs">
        {busy ? 'Saving…' : label}
      </button>
      {saved && <span className="text-xs text-corner-success">Saved</span>}
      {error && <span className="text-xs text-corner-error">{error}</span>}
    </div>
  );
}

export type FieldDef = { key: string; label: string; type?: 'text' | 'textarea' | 'boolean' };

/** Flat key/value section (strings, one optional boolean) — site, about, contact, promo, social. */
export function TextFieldsSection({
  sectionKey,
  title,
  fields,
  initialValue,
}: {
  sectionKey: string;
  title: string;
  fields: FieldDef[];
  initialValue: Record<string, unknown>;
}) {
  const router = useRouter();
  const [value, setValue] = useState<Record<string, unknown>>(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSave() {
    setBusy(true);
    setSaved(false);
    const result = await saveSection(sectionKey, value);
    setBusy(false);
    if (result.ok) {
      setSaved(true);
      setError(null);
      router.refresh();
    } else {
      setError(result.error ?? null);
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-3 space-y-3">
        {fields.map((f) => (
          <div key={f.key}>
            {f.type === 'boolean' ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(value[f.key])}
                  onChange={(e) => setValue((v) => ({ ...v, [f.key]: e.target.checked }))}
                />
                {f.label}
              </label>
            ) : (
              <>
                <label className="label" htmlFor={`${sectionKey}-${f.key}`}>{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    id={`${sectionKey}-${f.key}`}
                    className="input"
                    rows={3}
                    value={(value[f.key] as string) ?? ''}
                    onChange={(e) => setValue((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    id={`${sectionKey}-${f.key}`}
                    className="input"
                    value={(value[f.key] as string) ?? ''}
                    onChange={(e) => setValue((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <SaveBar busy={busy} error={error} saved={saved} onSave={onSave} />
    </div>
  );
}

/** Repeatable rows of flat objects — amenities, policies, gallery, testimonials. */
export function ObjectListSection({
  sectionKey,
  title,
  hint,
  fields,
  initialValue,
  emptyRow,
}: {
  sectionKey: string;
  title: string;
  hint?: string;
  fields: FieldDef[];
  initialValue: Record<string, unknown>[];
  emptyRow: Record<string, unknown>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, unknown>[]>(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateRow(index: number, key: string, val: string) {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, [key]: val } : row)));
  }

  async function onSave() {
    setBusy(true);
    setSaved(false);
    const result = await saveSection(sectionKey, rows);
    setBusy(false);
    if (result.ok) {
      setSaved(true);
      setError(null);
      router.refresh();
    } else {
      setError(result.error ?? null);
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-xs text-corner-muted">{hint}</p>}
      <div className="mt-3 space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-corner-stone p-3">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea className="input" rows={2} value={(row[f.key] as string) ?? ''} onChange={(e) => updateRow(i, f.key, e.target.value)} />
                ) : (
                  <input className="input" value={(row[f.key] as string) ?? ''} onChange={(e) => updateRow(i, f.key, e.target.value)} />
                )}
              </div>
            ))}
            <button type="button" onClick={() => setRows((r) => r.filter((_, idx) => idx !== i))} className="text-xs text-corner-danger hover:underline">
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={() => setRows((r) => [...r, { ...emptyRow }])} className="btn-secondary text-xs">
          Add
        </button>
      </div>
      <SaveBar busy={busy} error={error} saved={saved} onSave={onSave} />
    </div>
  );
}

/** Repeatable rows of plain strings — houseFeatures, safetyInfo, whatGuestsCanExpect. */
export function StringListSection({
  sectionKey,
  title,
  path,
  initialValue,
  fullSection,
}: {
  sectionKey: string;
  title: string;
  /** Key within the section object this string list lives at, e.g. 'houseFeatures'. */
  path: string;
  initialValue: string[];
  /** The rest of the section object, so saving this list doesn't clobber sibling fields. */
  fullSection: Record<string, unknown>;
}) {
  const router = useRouter();
  const [items, setItems] = useState<string[]>(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSave() {
    setBusy(true);
    setSaved(false);
    const result = await saveSection(sectionKey, { ...fullSection, [path]: items });
    setBusy(false);
    if (result.ok) {
      setSaved(true);
      setError(null);
      router.refresh();
    } else {
      setError(result.error ?? null);
    }
  }

  return (
    <div>
      <p className="label">{title}</p>
      <div className="mt-2 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="input"
              value={item}
              onChange={(e) => setItems((its) => its.map((it, idx) => (idx === i ? e.target.value : it)))}
            />
            <button type="button" onClick={() => setItems((its) => its.filter((_, idx) => idx !== i))} className="text-xs text-corner-danger">
              Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setItems((its) => [...its, ''])} className="mt-2 text-xs text-corner-gold hover:underline">
        + Add item
      </button>
      <SaveBar busy={busy} error={error} saved={saved} onSave={onSave} label="Save list" />
    </div>
  );
}

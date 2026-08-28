'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FaqGroup } from '@/lib/content/faq';

export function FaqEditor({ initialValue }: { initialValue: FaqGroup[] }) {
  const router = useRouter();
  const [groups, setGroups] = useState<FaqGroup[]>(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateItem(gi: number, ii: number, field: 'question' | 'answer', value: string) {
    setGroups((gs) =>
      gs.map((g, i) => (i !== gi ? g : { ...g, items: g.items.map((it, j) => (j !== ii ? it : { ...it, [field]: value })) })),
    );
  }

  function removeItem(gi: number, ii: number) {
    setGroups((gs) => gs.map((g, i) => (i !== gi ? g : { ...g, items: g.items.filter((_, j) => j !== ii) })));
  }

  function addItem(gi: number) {
    setGroups((gs) =>
      gs.map((g, i) => (i !== gi ? g : { ...g, items: [...g.items, { id: `custom-${Date.now()}`, question: '', answer: '' }] })),
    );
  }

  async function onSave() {
    setBusy(true);
    setSaved(false);
    const res = await fetch('/api/admin/content/faq', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: groups }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setError(null);
      router.refresh();
    } else {
      setError(data.error ?? 'Could not save.');
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold">FAQs</h2>
      <div className="mt-3 space-y-6">
        {groups.map((group, gi) => (
          <div key={group.title}>
            <p className="font-medium">{group.title}</p>
            <div className="mt-2 space-y-2">
              {group.items.map((item, ii) => (
                <div key={item.id} className="space-y-1 rounded-lg border border-corner-stone p-3">
                  <input
                    className="input"
                    placeholder="Question"
                    value={item.question}
                    onChange={(e) => updateItem(gi, ii, 'question', e.target.value)}
                  />
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Answer"
                    value={item.answer}
                    onChange={(e) => updateItem(gi, ii, 'answer', e.target.value)}
                  />
                  <button type="button" onClick={() => removeItem(gi, ii)} className="text-xs text-corner-danger hover:underline">
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => addItem(gi)} className="mt-2 text-xs text-corner-gold hover:underline">
              + Add question to {group.title}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" disabled={busy} onClick={onSave} className="btn-secondary text-xs">
          {busy ? 'Saving…' : 'Save FAQs'}
        </button>
        {saved && <span className="text-xs text-corner-success">Saved</span>}
        {error && <span className="text-xs text-corner-error">{error}</span>}
      </div>
    </div>
  );
}

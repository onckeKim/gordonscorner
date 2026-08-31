'use client';

import { useState } from 'react';
import type { AiGeneratedDraft, AiContentType } from '@/lib/ai/generate';

const CONTENT_TYPES: { value: AiContentType; label: string }[] = [
  { value: 'blog_post', label: 'Blog post' },
  { value: 'attraction_guide', label: 'Local attraction guide' },
  { value: 'seasonal_landing_page', label: 'Seasonal landing page' },
  { value: 'accommodation_description', label: 'Accommodation description' },
  { value: 'location_page', label: 'Location page' },
  { value: 'faq', label: 'FAQ entries' },
];

/**
 * Calls /api/admin/ai/generate and hands the result up to the parent
 * (NewBlogPostForm), which remounts BlogPostEditor with the draft as its
 * starting point. Never claims success on a failure — a 503 (feature not
 * configured) shows the exact fix (set ANTHROPIC_API_KEY), not a vague error.
 */
export function AiContentGenerator({ onGenerated }: { onGenerated: (draft: AiGeneratedDraft) => void }) {
  const [contentType, setContentType] = useState<AiContentType>('blog_post');
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, brief }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not generate a draft.');
      onGenerated(data.draft as AiGeneratedDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-lg font-semibold">Generate with AI</h2>
      <p className="mt-1 text-xs text-corner-muted">
        Drafts a title, meta description, headings, body, FAQ and CTA from a short brief — always
        review and fact-check before publishing. Requires <code>ANTHROPIC_API_KEY</code> to be set.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="ai-content-type">Content type</label>
          <select id="ai-content-type" className="input" value={contentType} onChange={(e) => setContentType(e.target.value as AiContentType)}>
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label className="label" htmlFor="ai-brief">Brief</label>
        <textarea
          id="ai-brief"
          className="input"
          rows={3}
          placeholder="e.g. A guide to whale watching season near the property, written for couples planning a weekend getaway."
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
        />
      </div>
      {error && <p className="mt-2 text-sm text-corner-error">{error}</p>}
      <button type="button" onClick={onGenerate} disabled={busy || brief.trim().length < 5} className="btn-secondary mt-3">
        {busy ? 'Generating…' : 'Generate draft'}
      </button>
    </div>
  );
}

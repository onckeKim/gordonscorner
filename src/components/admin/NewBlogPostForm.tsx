'use client';

import { useState } from 'react';
import { AiContentGenerator } from './AiContentGenerator';
import { BlogPostEditor } from './BlogPostEditor';
import type { AiGeneratedDraft } from '@/lib/ai/generate';

/**
 * Owns the hand-off between the AI generator and the editor: the editor's
 * form state is initialized once from its `draft` prop, so a fresh draft
 * needs a full remount (via `key`) to actually apply — not a live prop
 * update into an already-mounted, possibly-already-edited form.
 */
export function NewBlogPostForm() {
  const [draft, setDraft] = useState<AiGeneratedDraft | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);

  function handleGenerated(newDraft: AiGeneratedDraft) {
    setDraft(newDraft);
    setDraftVersion((v) => v + 1);
  }

  return (
    <div className="space-y-6">
      <AiContentGenerator onGenerated={handleGenerated} />
      <BlogPostEditor key={draftVersion} draft={draft ?? undefined} />
    </div>
  );
}

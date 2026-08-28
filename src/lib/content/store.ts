import 'server-only';
import { cache } from 'react';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';

/**
 * Generic CMS-style read/write for `content_sections` (migration 0008) — a
 * key/value store where each key is one editable "section" of public site
 * copy (home, property, amenities, policies, faq, gallery, promo, social,
 * contact). Falls back to the static default passed in when no row exists
 * yet for that key, so nothing needs seeding and every page keeps working
 * exactly as before until an admin actually edits something.
 */
export const getContentSection = cache(async function getContentSection<T>(key: string, fallback: T): Promise<T> {
  const db = createAdminSupabaseClient();
  const { data } = await db.from('content_sections').select('value').eq('key', key).maybeSingle();
  return data ? ((data.value as T) ?? fallback) : fallback;
});

/** Admin (role=admin) only. Overwrites one section and writes an audit log entry. */
export async function updateContentSection<T>(
  actor: { id: string; email: string },
  key: string,
  value: T,
): Promise<T> {
  const db = createAdminSupabaseClient();
  const { data: before } = await db.from('content_sections').select('value').eq('key', key).maybeSingle();

  const { data, error } = await db
    .from('content_sections')
    .upsert({ key, value: value as unknown as Record<string, unknown>, updated_by: actor.id }, { onConflict: 'key' })
    .select('value')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? `Could not update content section "${key}".`);
  }

  await writeAuditLog(actor, {
    action: 'content.update',
    recordType: 'content_section',
    recordId: key,
    changes: { before: before?.value ?? null, after: value },
  });

  return data.value as T;
}

/** All content_sections rows, for the admin overview page. */
export async function listContentSections() {
  const db = createAdminSupabaseClient();
  const { data } = await db.from('content_sections').select('key, updated_at').order('key', { ascending: true });
  return data ?? [];
}

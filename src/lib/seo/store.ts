import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { writeAuditLog, type AuditActor } from '@/lib/audit';
import type { PageSeoOverride, Redirect, RedirectStatusCode } from '@/types/database';

export class SeoStoreError extends Error {}

export async function listPageSeoOverrides(): Promise<PageSeoOverride[]> {
  const db = createAdminSupabaseClient();
  const { data } = await db.from('page_seo_overrides').select('*').order('path', { ascending: true });
  return data ?? [];
}

export interface PageSeoOverrideInput {
  path: string;
  title?: string;
  description?: string;
  canonical_path?: string;
  og_image_url?: string;
  noindex?: boolean;
}

/** Admin: creates or replaces the override for one path. Empty optional strings are stored as null, meaning "fall back to the page's coded default." */
export async function upsertPageSeoOverride(actor: AuditActor, input: PageSeoOverrideInput): Promise<PageSeoOverride> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from('page_seo_overrides')
    .upsert(
      {
        path: input.path,
        title: input.title || null,
        description: input.description || null,
        canonical_path: input.canonical_path || null,
        og_image_url: input.og_image_url || null,
        noindex: input.noindex ?? false,
        updated_by: actor.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'path' },
    )
    .select('*')
    .single();

  if (error || !data) throw new SeoStoreError('Could not save this page override.');

  await writeAuditLog(actor, { action: 'seo.page_override.upsert', recordType: 'page_seo_override', recordId: input.path, changes: { ...input } });
  return data;
}

export async function deletePageSeoOverride(actor: AuditActor, path: string): Promise<void> {
  const db = createAdminSupabaseClient();
  await db.from('page_seo_overrides').delete().eq('path', path);
  await writeAuditLog(actor, { action: 'seo.page_override.delete', recordType: 'page_seo_override', recordId: path });
}

export async function listRedirects(): Promise<Redirect[]> {
  const db = createAdminSupabaseClient();
  const { data } = await db.from('redirects').select('*').order('from_path', { ascending: true });
  return data ?? [];
}

export interface RedirectInput {
  from_path: string;
  to_path: string;
  status_code?: RedirectStatusCode;
}

export async function createRedirect(actor: AuditActor, input: RedirectInput): Promise<Redirect> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from('redirects')
    .insert({ from_path: input.from_path, to_path: input.to_path, status_code: input.status_code ?? 308, created_by: actor.id })
    .select('*')
    .single();

  if (error || !data) throw new SeoStoreError('Could not create this redirect — the source path may already have one.');

  await writeAuditLog(actor, { action: 'seo.redirect.create', recordType: 'redirect', recordId: data.id, changes: { ...input } });
  return data;
}

export async function deleteRedirect(actor: AuditActor, id: string): Promise<void> {
  const db = createAdminSupabaseClient();
  await db.from('redirects').delete().eq('id', id);
  await writeAuditLog(actor, { action: 'seo.redirect.delete', recordType: 'redirect', recordId: id });
}

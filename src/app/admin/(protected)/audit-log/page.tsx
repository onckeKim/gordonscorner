import Link from 'next/link';
import { requireRole } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const RECORD_TYPES = [
  'all',
  'booking',
  'payment',
  'settings',
  'content_section',
  'rate_override',
  'blocked_date',
  'profile',
  'privacy_request',
] as const;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarizeChanges(changes: Record<string, unknown> | null): string {
  if (!changes) return '—';
  const json = JSON.stringify(changes);
  return json.length > 160 ? `${json.slice(0, 160)}…` : json;
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireRole('admin');
  const { type } = await searchParams;
  const activeType = type ?? 'all';

  const db = createAdminSupabaseClient();
  let query = db.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(200);
  if (activeType !== 'all') {
    query = query.eq('record_type', activeType);
  }
  const { data: entries } = await query;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">Audit log</h1>
        <p className="text-xs text-corner-muted">
          Booking status changes and payment events have their own dedicated trails on each
          booking/payment — this log covers settings, content, calendar and team changes.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {RECORD_TYPES.map((t) => (
          <Link
            key={t}
            href={`/admin/audit-log?type=${t}`}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize ${
              activeType === t
                ? 'bg-corner-ink text-white'
                : 'border border-corner-border bg-white text-corner-ink hover:bg-corner-bg'
            }`}
          >
            {t.replace(/_/g, ' ')}
          </Link>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl2 border border-corner-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-corner-bg text-xs uppercase tracking-wide text-corner-muted">
            <tr>
              <th className="px-5 py-3">When</th>
              <th className="px-5 py-3">Admin</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Record</th>
              <th className="px-5 py-3">Changes</th>
            </tr>
          </thead>
          <tbody>
            {(entries ?? []).map((e) => (
              <tr key={e.id} className="border-t border-corner-border align-top">
                <td className="whitespace-nowrap px-5 py-3 text-corner-muted">{formatDateTime(e.created_at)}</td>
                <td className="px-5 py-3">{e.actor_email ?? '—'}</td>
                <td className="px-5 py-3">{e.action}</td>
                <td className="px-5 py-3 text-corner-muted">
                  {e.record_type}
                  {e.record_id ? ` · ${e.record_id.slice(0, 12)}` : ''}
                </td>
                <td className="max-w-md px-5 py-3 text-xs text-corner-muted">{summarizeChanges(e.changes)}</td>
              </tr>
            ))}
            {(entries ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-corner-muted">
                  No audit log entries in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export interface AuditActor {
  id: string;
  email: string;
}

export interface AuditLogInput {
  action: string;
  recordType: string;
  recordId?: string | null;
  changes?: Record<string, unknown> | null;
}

/**
 * Writes one row to the general admin_audit_log (migration 0007) — every
 * important admin action outside the booking/payment-specific trails that
 * already exist (booking_status_history, payment_events). Never throws:
 * a failed audit write shouldn't take down the action it's logging, so
 * errors are swallowed after a console warning.
 */
export async function writeAuditLog(actor: AuditActor, input: AuditLogInput): Promise<void> {
  try {
    const db = createAdminSupabaseClient();
    await db.from('admin_audit_log').insert({
      actor_id: actor.id,
      actor_email: actor.email,
      action: input.action,
      record_type: input.recordType,
      record_id: input.recordId ?? null,
      changes: input.changes ?? null,
    });
  } catch (err) {
    console.warn('Failed to write audit log entry:', err);
  }
}

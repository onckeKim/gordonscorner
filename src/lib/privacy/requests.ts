import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { writeAuditLog, type AuditActor } from '@/lib/audit';
import type { PrivacyRequest, PrivacyRequestStatus, PrivacyRequestType } from '@/types/database';

export class WorkflowError extends Error {}

export interface CreatePrivacyRequestInput {
  requestType: PrivacyRequestType;
  name: string;
  email: string;
  details?: string;
}

/** Guest-facing: logs a new data export/correction/deletion request for admin triage. */
export async function createPrivacyRequest(input: CreatePrivacyRequestInput): Promise<PrivacyRequest> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from('privacy_requests')
    .insert({
      request_type: input.requestType,
      name: input.name,
      email: input.email,
      details: input.details ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new WorkflowError('Could not submit your request right now. Please try again or contact us directly.');
  }
  return data;
}

export interface UpdatePrivacyRequestInput {
  status: PrivacyRequestStatus;
  adminNote?: string;
}

/** Admin: updates a request's triage status/note and records the action in the audit log. */
export async function updatePrivacyRequest(
  id: string,
  actor: AuditActor,
  input: UpdatePrivacyRequestInput,
): Promise<PrivacyRequest> {
  const db = createAdminSupabaseClient();
  const isResolved = input.status === 'completed' || input.status === 'rejected';

  const { data, error } = await db
    .from('privacy_requests')
    .update({
      status: input.status,
      admin_note: input.adminNote ?? null,
      resolved_by: isResolved ? actor.id : null,
      resolved_at: isResolved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    throw new WorkflowError('Could not update this request.');
  }

  await writeAuditLog(actor, {
    action: 'privacy_request_status_change',
    recordType: 'privacy_request',
    recordId: id,
    changes: { status: input.status },
  });

  return data;
}

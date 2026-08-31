import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { updatePrivacyRequest, WorkflowError } from '@/lib/privacy/requests';
import { handleApiError } from '@/lib/api-response';

const updateSchema = z.object({
  status: z.enum(['new', 'in_progress', 'completed', 'rejected']),
  adminNote: z.string().trim().max(2000).optional(),
});

/** Admin: triage a privacy request (mark in progress/completed/rejected, leave a note). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = updateSchema.parse(await request.json());

    const updated = await updatePrivacyRequest(id, admin, body);
    return NextResponse.json({ request: updated });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return handleApiError(err);
  }
}

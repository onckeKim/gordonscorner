import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';
import { handleApiError } from '@/lib/api-response';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const db = createAdminSupabaseClient();
    const { data: existing } = await db.from('blocked_dates').select('*').eq('id', id).maybeSingle();
    const { error } = await db.from('blocked_dates').delete().eq('id', id);
    if (error) throw error;

    await writeAuditLog(admin, {
      action: 'blocked_date.delete',
      recordType: 'blocked_date',
      recordId: id,
      changes: { deleted: existing },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

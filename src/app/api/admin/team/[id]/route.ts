import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({ role: z.enum(['admin', 'staff']) });

/** Admin role only: change another (or their own) portal user's role. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireRole('admin');
    const { id } = await params;
    const { role } = bodySchema.parse(await request.json());

    const db = createAdminSupabaseClient();

    if (id === actor.id && role !== 'admin') {
      const { count } = await db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: "You can't remove the last admin's admin role." }, { status: 400 });
      }
    }

    const { data: before } = await db.from('profiles').select('*').eq('id', id).maybeSingle();
    const { data, error } = await db.from('profiles').update({ role }).eq('id', id).select('*').single();
    if (error || !data) throw error ?? new Error('Could not update role.');

    await writeAuditLog(actor, {
      action: 'profile.update_role',
      recordType: 'profile',
      recordId: id,
      changes: { before: before?.role, after: role },
    });

    return NextResponse.json({ profile: data });
  } catch (err) {
    return handleApiError(err);
  }
}

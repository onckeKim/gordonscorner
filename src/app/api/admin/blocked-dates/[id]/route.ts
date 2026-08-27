import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-response';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = createAdminSupabaseClient();
    const { error } = await db.from('blocked_dates').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

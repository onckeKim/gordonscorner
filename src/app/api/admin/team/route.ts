import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-response';

/** Admin role only: list every portal user for the Settings team panel. */
export async function GET() {
  try {
    await requireRole('admin');
    const db = createAdminSupabaseClient();
    const { data, error } = await db.from('profiles').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ profiles: data ?? [] });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { startDate, endDate, reason } = bodySchema.parse(await request.json());

    if (endDate <= startDate) {
      return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 });
    }

    const db = createAdminSupabaseClient();
    const { data, error } = await db
      .from('blocked_dates')
      .insert({ start_date: startDate, end_date: endDate, reason: reason ?? null, created_by: admin.id })
      .select('*')
      .single();

    if (error) throw error;

    await writeAuditLog(admin, {
      action: 'blocked_date.create',
      recordType: 'blocked_date',
      recordId: data.id,
      changes: { start_date: startDate, end_date: endDate, reason: reason ?? null },
    });

    return NextResponse.json({ blockedDate: data }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

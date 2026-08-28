import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { deleteRateOverride } from '@/lib/settings';
import { handleApiError } from '@/lib/api-response';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    await deleteRateOverride(admin, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

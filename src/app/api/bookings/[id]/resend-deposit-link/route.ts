import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { resendPaymentLink } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

/** Admin: resend the deposit payment link (e.g. the guest lost the original email). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    await resendPaymentLink(id, admin.id, 'deposit');
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { addPaymentNote } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({ note: z.string().trim().max(2000) });

/** Admin: add/update an internal note on a payment. Never guest-facing. */
export async function POST(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  try {
    const admin = await requireAdmin();
    const { paymentId } = await params;
    const { note } = bodySchema.parse(await request.json());
    const payment = await addPaymentNote(paymentId, admin.id, note);
    return NextResponse.json({ payment });
  } catch (err) {
    return handleApiError(err);
  }
}

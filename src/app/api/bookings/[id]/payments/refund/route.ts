import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { issueRefund } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({
  amount: z.number().positive(),
  sourcePaymentId: z.string().uuid().optional(),
  reason: z.string().trim().max(2000).optional(),
});

/** Admin: issue/record a refund (full or partial) against this booking. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    const booking = await issueRefund(id, admin.id, body);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { declineBooking } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({ reason: z.string().trim().max(2000).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { reason } = bodySchema.parse(await request.json().catch(() => ({})));
    const booking = await declineBooking(id, admin.id, reason);
    return NextResponse.json({ booking });
  } catch (err) {
    return handleApiError(err);
  }
}

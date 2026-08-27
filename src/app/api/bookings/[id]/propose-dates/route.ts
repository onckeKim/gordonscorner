import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { proposeAlternativeDates } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({
  proposedCheckIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  proposedCheckOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { proposedCheckIn, proposedCheckOut } = bodySchema.parse(await request.json());
    const booking = await proposeAlternativeDates(id, admin.id, proposedCheckIn, proposedCheckOut);
    return NextResponse.json({ booking });
  } catch (err) {
    return handleApiError(err);
  }
}

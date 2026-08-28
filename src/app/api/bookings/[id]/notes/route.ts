import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { updateInternalNotes } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({ notes: z.string().trim().max(5000) });

/** Admin: set/replace the private internal notes on a booking. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { notes } = bodySchema.parse(await request.json());
    const booking = await updateInternalNotes(id, admin, notes);
    return NextResponse.json({ booking });
  } catch (err) {
    return handleApiError(err);
  }
}

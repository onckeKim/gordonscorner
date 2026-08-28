import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { updateGuestInfo } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(6).max(40).optional(),
  country: z.string().trim().min(2).max(60).optional(),
});

/** Admin: correct/update guest contact details on a booking. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const input = bodySchema.parse(await request.json());
    const booking = await updateGuestInfo(id, admin, input);
    return NextResponse.json({ booking });
  } catch (err) {
    return handleApiError(err);
  }
}

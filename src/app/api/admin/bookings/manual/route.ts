import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { createManualBooking } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  guestEmail: z.string().trim().email(),
  guestPhone: z.string().trim().max(40).optional(),
  guestCountry: z.string().trim().max(60).optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adultsCount: z.number().int().min(1).max(20),
  childrenCount: z.number().int().min(0).max(20),
  message: z.string().trim().max(2000).optional(),
  initialStatus: z.enum(['confirmed', 'accepted_awaiting_deposit']),
});

/** Admin: create a booking directly (phone/email enquiry, walk-in, etc.). */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = bodySchema.parse(await request.json());
    const booking = await createManualBooking(admin, input);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

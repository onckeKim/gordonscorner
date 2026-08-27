import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createBookingRequest } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const bookingRequestSchema = z.object({
  guestName: z.string().trim().min(2).max(120),
  guestEmail: z.string().trim().email(),
  guestPhone: z.string().trim().max(40).optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adultsCount: z.number().int().min(1).max(20),
  childrenCount: z.number().int().min(0).max(20),
  message: z.string().trim().max(2000).optional(),
  policyAgreed: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm you agree to the house rules and cancellation policy.' }),
  }),
});

/** Public endpoint: guest submits a new booking request. */
export async function POST(request: NextRequest) {
  try {
    const body = bookingRequestSchema.parse(await request.json());
    const booking = await createBookingRequest(body);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

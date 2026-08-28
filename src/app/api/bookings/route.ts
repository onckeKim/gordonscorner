import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createBookingRequest } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const bookingRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  guestEmail: z.string().trim().email(),
  guestPhone: z.string().trim().min(6).max(40),
  guestCountry: z.string().trim().min(2).max(60),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adultsCount: z.number().int().min(1).max(20),
  childrenCount: z.number().int().min(0).max(20),
  estimatedArrivalTime: z.string().trim().max(60).optional(),
  message: z.string().trim().max(2000).optional(),
  bookingPurpose: z.enum(['leisure', 'business', 'other']).optional(),
  termsAgreed: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm you accept the booking policy.' }),
  }),
  cancellationPolicyAgreed: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm you accept the cancellation policy.' }),
  }),
  privacyPolicyAgreed: z.literal(true, {
    errorMap: () => ({ message: 'Please confirm you accept the privacy policy.' }),
  }),
  communicationConsent: z.boolean(),
  policyVersion: z.string().trim().min(1).max(40),
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

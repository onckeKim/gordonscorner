import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createBookingRequest, WorkflowError } from '@/lib/booking/workflow';
import { checkIpRateLimit } from '@/lib/rate-limit';
import { checkHoneypot } from '@/lib/spam-protection';
import { logAnalyticsEvent } from '@/lib/analytics/log-event';
import { handleApiError, RateLimitError } from '@/lib/api-response';

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
  website: z.string().max(0).optional(), // honeypot
  formRenderedAt: z.number().optional(),
});

/** Public endpoint: guest submits a new booking request. */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkIpRateLimit(request, 'bookings', 10, 60 * 60))) {
      throw new RateLimitError('Too many booking requests from this connection recently. Please try again later, or contact us directly.');
    }

    const body = bookingRequestSchema.parse(await request.json());
    if (!checkHoneypot(body)) {
      throw new WorkflowError('Could not submit your request. Please try again.');
    }

    const booking = await createBookingRequest(body);
    await logAnalyticsEvent({
      eventType: 'booking_requested',
      bookingId: booking.id,
      metadata: { checkIn: booking.check_in, checkOut: booking.check_out },
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

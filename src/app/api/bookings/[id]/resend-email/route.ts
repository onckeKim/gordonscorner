import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { resendBookingEmail } from '@/lib/booking/workflow';
import { RESENDABLE_EMAIL_TYPES } from '@/lib/booking/resendable-email-types';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({ emailType: z.enum(RESENDABLE_EMAIL_TYPES) });

/** Admin: resend any applicable guest email for this booking (view /admin/bookings/[id] history for delivery status). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { emailType } = bodySchema.parse(await request.json());
    await resendBookingEmail(id, admin, emailType);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sendEnquiryEmail } from '@/lib/email';
import { handleApiError } from '@/lib/api-response';

const enquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  message: z.string().trim().min(5).max(2000),
});

/** Public endpoint: general enquiry form (see components/Newsletter.tsx). */
export async function POST(request: NextRequest) {
  try {
    const body = enquirySchema.parse(await request.json());
    await sendEnquiryEmail(body);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

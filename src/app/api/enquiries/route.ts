import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sendEnquiryEmail } from '@/lib/email';
import { checkIpRateLimit } from '@/lib/rate-limit';
import { checkHoneypot } from '@/lib/spam-protection';
import { logAnalyticsEvent } from '@/lib/analytics/log-event';
import { handleApiError, RateLimitError } from '@/lib/api-response';

const enquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  message: z.string().trim().min(5).max(2000),
  website: z.string().max(0).optional(), // honeypot — real users never see or fill this field
  formRenderedAt: z.number().optional(), // timestamp the form mounted, for a minimum-fill-time bot check
});

/** Public endpoint: general enquiry form (see components/EnquiryForm.tsx, components/Newsletter.tsx). */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkIpRateLimit(request, 'enquiries', 5, 60 * 60))) {
      throw new RateLimitError('Too many messages sent from this connection recently. Please try again later.');
    }

    const body = enquirySchema.parse(await request.json());
    if (!checkHoneypot(body)) {
      // Silently succeed for bots — never reveal that spam protection caught them.
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    await sendEnquiryEmail(body);
    await logAnalyticsEvent({ eventType: 'contact_form_submitted' });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

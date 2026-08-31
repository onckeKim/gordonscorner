import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createPrivacyRequest, WorkflowError } from '@/lib/privacy/requests';
import { sendPrivacyRequestEmail } from '@/lib/email';
import { checkIpRateLimit } from '@/lib/rate-limit';
import { checkHoneypot } from '@/lib/spam-protection';
import { handleApiError, RateLimitError } from '@/lib/api-response';

const privacyRequestSchema = z.object({
  requestType: z.enum(['export', 'correction', 'deletion']),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  details: z.string().trim().max(2000).optional(),
  website: z.string().max(0).optional(), // honeypot
  formRenderedAt: z.number().optional(),
});

/** Public endpoint: guest submits a data export/correction/deletion request (see /privacy-request). */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkIpRateLimit(request, 'privacy-requests', 5, 60 * 60))) {
      throw new RateLimitError('Too many requests submitted from this connection recently. Please try again later.');
    }

    const body = privacyRequestSchema.parse(await request.json());
    if (!checkHoneypot(body)) {
      // Silently succeed for bots — never reveal that spam protection caught them.
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const created = await createPrivacyRequest(body);
    await sendPrivacyRequestEmail(body);
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return handleApiError(err);
  }
}

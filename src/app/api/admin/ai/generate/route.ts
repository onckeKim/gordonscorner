import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/admin';
import { generateContent, isAiGenerationAvailable, AiGenerationError, type AiContentType } from '@/lib/ai/generate';
import { checkRateLimit } from '@/lib/rate-limit';
import { siteConfig } from '@/lib/config';
import { handleApiError, RateLimitError } from '@/lib/api-response';

const CONTENT_TYPES: AiContentType[] = [
  'blog_post',
  'accommodation_description',
  'location_page',
  'faq',
  'attraction_guide',
  'seasonal_landing_page',
];

const bodySchema = z.object({
  contentType: z.enum(CONTENT_TYPES as [AiContentType, ...AiContentType[]]),
  brief: z.string().trim().min(5).max(1000),
});

/** Admin role only, rate-limited per admin — each call costs the owner's own Anthropic API usage. */
export async function POST(request: Request) {
  try {
    const admin = await requireRole('admin');

    if (!isAiGenerationAvailable()) {
      return NextResponse.json({ error: 'AI content generation is not configured. Set ANTHROPIC_API_KEY to enable it.' }, { status: 503 });
    }

    if (!(await checkRateLimit(`ai-generate:${admin.id}`, 20, 60 * 60))) {
      throw new RateLimitError('Too many generation requests this hour. Please try again later.');
    }

    const { contentType, brief } = bodySchema.parse(await request.json());
    const draft = await generateContent({ contentType, brief, propertyName: siteConfig.propertyName, address: siteConfig.address });
    return NextResponse.json({ draft });
  } catch (err) {
    if (err instanceof AiGenerationError) return NextResponse.json({ error: err.message }, { status: 502 });
    return handleApiError(err);
  }
}

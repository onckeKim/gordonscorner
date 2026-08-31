import 'server-only';
import { z } from 'zod';

/**
 * Calls the Anthropic Messages API directly via fetch (no SDK dependency)
 * to draft SEO-shaped content from a short brief. Strictly opt-in: with no
 * ANTHROPIC_API_KEY configured, generateContent() throws a clear
 * AiGenerationError rather than the feature silently returning fake
 * content — matches this app's "off until configured" pattern for every
 * other optional third-party integration (Resend, PayFast, GA4, ...).
 */

export class AiGenerationError extends Error {}

export type AiContentType =
  | 'blog_post'
  | 'accommodation_description'
  | 'location_page'
  | 'faq'
  | 'attraction_guide'
  | 'seasonal_landing_page';

const CONTENT_TYPE_LABELS: Record<AiContentType, string> = {
  blog_post: 'a blog post',
  accommodation_description: 'an accommodation/property description',
  location_page: 'a local area guide page',
  faq: 'a set of FAQ entries',
  attraction_guide: 'a local attraction guide article',
  seasonal_landing_page: 'a seasonal landing page',
};

const draftSchema = z.object({
  title: z.string(),
  metaDescription: z.string(),
  slug: z.string(),
  headings: z.array(z.string()),
  body: z.string(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })),
  cta: z.string(),
  internalLinkSuggestions: z.array(z.string()),
});

export type AiGeneratedDraft = z.infer<typeof draftSchema>;

export function isAiGenerationAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface GenerateContentInput {
  contentType: AiContentType;
  brief: string;
  propertyName: string;
  address: string;
}

export async function generateContent(input: GenerateContentInput): Promise<AiGeneratedDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiGenerationError('AI content generation is not configured — set ANTHROPIC_API_KEY to enable it.');
  }

  const prompt = `You are writing ${CONTENT_TYPE_LABELS[input.contentType]} for "${input.propertyName}", a short-stay accommodation property in ${input.address}.

Brief from the property owner: ${input.brief}

Write natural, honest, guest-useful content — never keyword-stuff, and never invent specific facts you don't have (prices, exact distances, real business names). Use a clearly-marked bracketed placeholder like [restaurant name] instead of fabricating one.

Respond with ONLY a JSON object — no markdown code fences, no commentary before or after — matching exactly this shape:
{
  "title": string,
  "metaDescription": string (120-160 characters),
  "slug": string (lowercase, hyphen-separated, no spaces),
  "headings": string[] (2-5 section headings),
  "body": string (the full article body — one "## Heading" line per section from the headings list, each followed by one or more paragraphs, blank line between paragraphs),
  "faq": [{ "question": string, "answer": string }] (2-4 entries),
  "cta": string (one short call-to-action sentence inviting the reader to check availability or get in touch),
  "internalLinkSuggestions": string[] (2-4 short phrases suggesting where this content could link to another page on the site)
}`;

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (err) {
    console.error('Failed to reach Anthropic API:', err);
    throw new AiGenerationError('Could not reach the AI provider. Please try again.');
  }

  if (!response.ok) {
    console.error('Anthropic API error:', response.status, await response.text().catch(() => ''));
    throw new AiGenerationError('The AI provider returned an error. Please try again.');
  }

  const data: unknown = await response.json();
  const text = (data as { content?: { text?: string }[] })?.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new AiGenerationError('Could not parse the AI response.');
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new AiGenerationError('The AI response was not in the expected format. Please try again.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new AiGenerationError('The AI response was not valid JSON. Please try again.');
  }

  const result = draftSchema.safeParse(parsed);
  if (!result.success) {
    throw new AiGenerationError('The AI response was missing expected fields. Please try again.');
  }

  return result.data;
}

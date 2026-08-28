import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/admin';
import { updateContentSection } from '@/lib/content/store';
import { CONTENT_SECTIONS } from '@/lib/content/sections';
import { handleApiError } from '@/lib/api-response';

const VALID_KEYS = CONTENT_SECTIONS.map((s) => s.key);
const bodySchema = z.object({ value: z.union([z.record(z.unknown()), z.array(z.unknown())]) });

/** Admin role only: overwrite one content section (home text, amenities, FAQs, gallery, etc). */
export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const admin = await requireRole('admin');
    const { key } = await params;

    if (!VALID_KEYS.includes(key as (typeof VALID_KEYS)[number])) {
      return NextResponse.json({ error: `Unknown content section "${key}".` }, { status: 404 });
    }

    const { value } = bodySchema.parse(await request.json());
    const updated = await updateContentSection(admin, key, value);
    return NextResponse.json({ value: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

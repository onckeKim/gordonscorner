import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/admin';
import { getSettings, updateSettings } from '@/lib/settings';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({
  ga4_measurement_id: z.string().trim().max(30).nullable().optional(),
  gtm_container_id: z.string().trim().max(30).nullable().optional(),
  clarity_project_id: z.string().trim().max(30).nullable().optional(),
  fb_pixel_id: z.string().trim().max(30).nullable().optional(),
  gsc_verification_code: z.string().trim().max(200).nullable().optional(),
  google_business_profile_url: z.string().trim().url().max(500).nullable().or(z.literal('')).optional(),
  google_place_id: z.string().trim().max(200).nullable().optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  service_area: z.string().trim().max(300).nullable().optional(),
  default_og_image_url: z.string().trim().url().max(500).nullable().or(z.literal('')).optional(),
});

/** Admin (any role): read the current SEO/tracking settings. */
export async function GET() {
  try {
    await requireRole('admin');
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Admin role only: update SEO/tracking settings. Every change is written to the audit log (via updateSettings). */
export async function PATCH(request: Request) {
  try {
    const admin = await requireRole('admin');
    const patch = bodySchema.parse(await request.json());
    // Empty strings mean "clear this field" — store as null, matching the pattern for optional URL fields.
    const normalized = Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === '' ? null : v]));
    const settings = await updateSettings(admin, normalized);
    return NextResponse.json({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

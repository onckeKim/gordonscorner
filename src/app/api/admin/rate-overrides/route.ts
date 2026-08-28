import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { createRateOverride } from '@/lib/settings';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    label: z.string().trim().max(120).optional(),
    nightlyRate: z.coerce.number().positive().optional(),
    minNights: z.coerce.number().int().positive().optional(),
  })
  .refine((v) => v.nightlyRate != null || v.minNights != null, {
    message: 'Set a nightly rate, a minimum stay, or both.',
  });

/** Admin: create a date-specific/seasonal nightly-rate or minimum-stay override. */
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const input = bodySchema.parse(await request.json());

    if (input.endDate <= input.startDate) {
      return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 });
    }

    const override = await createRateOverride(admin, input);
    return NextResponse.json({ override }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

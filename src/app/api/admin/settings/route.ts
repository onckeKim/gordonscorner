import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, requireRole } from '@/lib/auth/admin';
import { getSettings, updateSettings } from '@/lib/settings';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({
  property_name: z.string().trim().min(1).max(120).optional(),
  currency: z.string().trim().length(3).optional(),
  time_zone: z.string().trim().min(1).max(60).optional(),
  default_nightly_rate: z.coerce.number().positive().optional(),
  weekend_nightly_rate: z.coerce.number().positive().nullable().optional(),
  deposit_percentage: z.coerce.number().min(1).max(100).optional(),
  min_nights: z.coerce.number().int().min(1).optional(),
  max_nights: z.coerce.number().int().min(1).optional(),
  guest_capacity: z.coerce.number().int().min(1).optional(),
  lead_time_hours: z.coerce.number().int().min(0).optional(),
  same_day_booking_enabled: z.boolean().optional(),
  max_advance_booking_days: z.coerce.number().int().min(1).optional(),
  hold_period_hours: z.coerce.number().int().min(1).optional(),
  tax_rate_percent: z.coerce.number().min(0).max(100).optional(),
  cleaning_fee: z.coerce.number().min(0).optional(),
  service_fee: z.coerce.number().min(0).optional(),
  security_deposit: z.coerce.number().min(0).optional(),
  payment_deadline_hours: z.coerce.number().int().min(1).optional(),
  balance_payment_deadline_days: z.coerce.number().int().min(0).optional(),
  cancellation_policy: z.string().trim().min(1).max(2000).optional(),
  admin_notification_email: z.string().trim().email().optional(),
  check_in_time: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
  check_out_time: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
});

/** Admin (any role): read the current settings. */
export async function GET() {
  try {
    await requireAdmin();
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Admin role only: update settings. Every change is written to the audit log. */
export async function PATCH(request: Request) {
  try {
    const admin = await requireRole('admin');
    const patch = bodySchema.parse(await request.json());
    const settings = await updateSettings(admin, patch);
    return NextResponse.json({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

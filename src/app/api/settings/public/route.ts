import { NextResponse } from 'next/server';
import { getSettings, getDateRateOverrides, toPublicSettings } from '@/lib/settings';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/**
 * Public endpoint: the subset of admin-configured settings + active rate
 * overrides guests need for an accurate live price/availability estimate on
 * the booking form. The server always re-validates and recalculates at
 * submission time regardless (see createBookingRequest) — this just keeps
 * the client-side preview from drifting out of date with whatever an admin
 * last configured.
 */
export async function GET() {
  try {
    const [settings, rateOverrides] = await Promise.all([getSettings(), getDateRateOverrides()]);
    return NextResponse.json({
      settings: toPublicSettings(settings),
      rateOverrides: rateOverrides.map((r) => ({
        start_date: r.start_date,
        end_date: r.end_date,
        label: r.label,
        nightly_rate: r.nightly_rate,
        min_nights: r.min_nights,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

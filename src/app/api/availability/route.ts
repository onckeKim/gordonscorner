import { NextResponse } from 'next/server';
import { getUnavailableRanges } from '@/lib/booking/availability';
import { handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

/** Public endpoint: returns booked/blocked/held date ranges for the calendar. */
export async function GET() {
  try {
    const ranges = await getUnavailableRanges();
    return NextResponse.json({ ranges });
  } catch (err) {
    return handleApiError(err);
  }
}

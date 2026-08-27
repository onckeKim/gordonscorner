import { NextResponse, type NextRequest } from 'next/server';
import { expireStaleHolds } from '@/lib/booking/workflow';

export const dynamic = 'force-dynamic';

/**
 * Releases accepted-but-unpaid bookings whose hold window has lapsed.
 * Schedule this via Vercel Cron (vercel.json) hitting this URL with the
 * `Authorization: Bearer ${CRON_SECRET}` header, e.g. every 15 minutes.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const expiredCount = await expireStaleHolds();
  return NextResponse.json({ expiredCount });
}

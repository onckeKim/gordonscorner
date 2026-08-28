import { NextResponse, type NextRequest } from 'next/server';
import {
  sendDueDepositReminders,
  sendDueDepositDeadlineWarnings,
  sendDueBalanceReminders,
  sendDuePreArrivalEmails,
  sendDueCheckInInstructions,
  sendDueCheckOutReminders,
  sendDuePostStayThankYous,
  sendDueReviewRequests,
} from '@/lib/booking/workflow';

export const dynamic = 'force-dynamic';

/**
 * Sends every time-based (as opposed to event-triggered) guest email:
 * deposit reminder/deadline-warning, balance reminder, pre-arrival info,
 * check-in instructions, check-out reminder, post-stay thank-you, review
 * request. Each is idempotent per booking (see migration 0009's *_sent_at
 * columns), so this is safe to run more than once a day. Schedule via
 * Vercel Cron (vercel.json) hitting this URL with the
 * `Authorization: Bearer ${CRON_SECRET}` header — once a day is enough
 * given every window here is date-based, not time-of-day based.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const [
    depositReminders,
    depositDeadlineWarnings,
    balanceReminders,
    preArrival,
    checkInInstructions,
    checkOutReminders,
    thankYous,
    reviewRequests,
  ] = await Promise.all([
    sendDueDepositReminders(),
    sendDueDepositDeadlineWarnings(),
    sendDueBalanceReminders(),
    sendDuePreArrivalEmails(),
    sendDueCheckInInstructions(),
    sendDueCheckOutReminders(),
    sendDuePostStayThankYous(),
    sendDueReviewRequests(),
  ]);

  return NextResponse.json({
    depositReminders,
    depositDeadlineWarnings,
    balanceReminders,
    preArrival,
    checkInInstructions,
    checkOutReminders,
    thankYous,
    reviewRequests,
  });
}

import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/**
 * First-party funnel event log (see migration 0013's analytics_events
 * table, and /admin/analytics). Called directly from the server-side
 * moment each funnel step actually happens (booking created, enquiry
 * sent, deposit paid, booking confirmed) — never from a client-posted
 * event, so the numbers can't be inflated by a bot hitting a public
 * endpoint. Never throws: a logging failure must not affect the booking/
 * payment/enquiry flow it's observing.
 */
export async function logAnalyticsEvent(input: {
  eventType: string;
  bookingId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const db = createAdminSupabaseClient();
    await db.from('analytics_events').insert({
      event_type: input.eventType,
      booking_id: input.bookingId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.warn('Failed to log analytics event:', input.eventType, err);
  }
}

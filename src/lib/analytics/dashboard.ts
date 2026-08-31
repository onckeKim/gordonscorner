import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export interface FunnelSummary {
  contactFormSubmitted: number;
  bookingRequested: number;
  depositPaid: number;
  balancePaid: number;
  bookingConfirmed: number;
  /** deposit_paid / booking_requested, as a percentage, null if there were no requests to divide by. */
  requestToDepositRate: number | null;
}

const EVENT_TYPES = ['contact_form_submitted', 'booking_requested', 'deposit_paid', 'balance_paid', 'booking_confirmed'] as const;

/**
 * Real first-party funnel numbers from our own analytics_events log (see
 * migration 0013) — not a substitute for GA4/Clarity (those are optional,
 * owner-configured third-party accounts, see /admin/seo), but available
 * with zero external setup and impossible to lose access to.
 */
export async function getFunnelSummary(sinceIso?: string): Promise<FunnelSummary> {
  const db = createAdminSupabaseClient();
  let query = db.from('analytics_events').select('event_type').in('event_type', [...EVENT_TYPES]);
  if (sinceIso) query = query.gte('created_at', sinceIso);
  const { data } = await query;

  const counts = Object.fromEntries(EVENT_TYPES.map((t) => [t, 0])) as Record<(typeof EVENT_TYPES)[number], number>;
  for (const row of data ?? []) {
    if (row.event_type in counts) counts[row.event_type as (typeof EVENT_TYPES)[number]] += 1;
  }

  return {
    contactFormSubmitted: counts.contact_form_submitted,
    bookingRequested: counts.booking_requested,
    depositPaid: counts.deposit_paid,
    balancePaid: counts.balance_paid,
    bookingConfirmed: counts.booking_confirmed,
    requestToDepositRate: counts.booking_requested > 0 ? Math.round((counts.deposit_paid / counts.booking_requested) * 1000) / 10 : null,
  };
}

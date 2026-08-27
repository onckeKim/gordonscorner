import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { bookingRules } from '@/lib/config';
import { isWithinLeadTime, leadTimeDescription, todayIsoInPropertyTimeZone } from '@/lib/timezone';
import { daysBetweenIso, addDaysIso } from '@/lib/date-utils';

export interface DateRange {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD (exclusive)
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Two half-open ranges [start, end) overlap iff a.start < b.end && b.start < a.end. */
function rangesOverlap(a: DateRange, b: { start_date: string; end_date: string }): boolean {
  return a.checkIn < b.end_date && b.start_date < a.checkOut;
}

export interface AvailabilityCheckResult {
  available: boolean;
  reason?: string;
}

/**
 * Validates a requested date range against the business rules (min/max
 * nights, lead time, max advance window) and against existing
 * holds/bookings/blocked dates. This is the single source of truth for
 * "can these dates be booked" — used both by the public availability
 * endpoint and the booking-create route (server-side, so it can't be
 * bypassed by tampering with client JS).
 *
 * This is a fast, friendly pre-check. The actual insert is additionally
 * protected by a database-level EXCLUDE constraint (see migration
 * 0005_prevent_double_booking.sql) that is the real defence against race
 * conditions — two simultaneous requests can both pass this check before
 * either commits, but only one can win the constraint.
 */
export async function checkAvailability(range: DateRange): Promise<AvailabilityCheckResult> {
  if (!ISO_DATE_RE.test(range.checkIn) || !ISO_DATE_RE.test(range.checkOut)) {
    return { available: false, reason: 'Invalid dates.' };
  }

  const nights = daysBetweenIso(range.checkIn, range.checkOut);

  if (nights < bookingRules.minNights) {
    return {
      available: false,
      reason: `Minimum stay is ${bookingRules.minNights} nights.`,
    };
  }

  if (nights > bookingRules.maxNights) {
    return {
      available: false,
      reason: `Maximum stay is ${bookingRules.maxNights} nights. Please contact us for longer stays.`,
    };
  }

  const today = todayIsoInPropertyTimeZone();
  if (range.checkIn < today) {
    return { available: false, reason: 'Check-in date is in the past.' };
  }

  if (!isWithinLeadTime(range.checkIn)) {
    return {
      available: false,
      reason: `Bookings must be made ${leadTimeDescription()}.`,
    };
  }

  const maxAdvance = addDaysIso(today, bookingRules.maxAdvanceBookingDays);
  if (range.checkIn > maxAdvance) {
    return {
      available: false,
      reason: `Bookings can only be made up to ${bookingRules.maxAdvanceBookingDays} days in advance.`,
    };
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from('public_unavailable_ranges').select('*');

  if (error) {
    throw new Error(`Failed to check availability: ${error.message}`);
  }

  const conflict = (data ?? []).some((blocked) => rangesOverlap(range, blocked));
  if (conflict) {
    return { available: false, reason: 'Some of these dates are already unavailable.' };
  }

  return { available: true };
}

/** Fetches all unavailable date ranges for rendering the public calendar. */
export async function getUnavailableRanges() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from('public_unavailable_ranges').select('*');

  if (error) {
    throw new Error(`Failed to load unavailable ranges: ${error.message}`);
  }

  return data ?? [];
}

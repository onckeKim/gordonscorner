import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { isWithinLeadTime, leadTimeDescription, todayIsoInPropertyTimeZone } from '@/lib/timezone';
import { daysBetweenIso, addDaysIso } from '@/lib/date-utils';
import { getSettings, getDateRateOverrides } from '@/lib/settings';

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
 * nights, lead time, max advance window — all live from src/lib/settings.ts,
 * including any date-specific minimum-stay override) and against existing
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

  const [settings, rateOverrides] = await Promise.all([getSettings(), getDateRateOverrides()]);
  const nights = daysBetweenIso(range.checkIn, range.checkOut);

  const minStayOverride = rateOverrides.find(
    (r) => r.min_nights != null && range.checkIn >= r.start_date && range.checkIn < r.end_date,
  );
  const minNights = Math.max(settings.min_nights, minStayOverride?.min_nights ?? 0);

  if (nights < minNights) {
    return {
      available: false,
      reason: minStayOverride
        ? `Minimum stay for these dates is ${minNights} nights (${minStayOverride.label ?? 'seasonal minimum'}).`
        : `Minimum stay is ${minNights} nights.`,
    };
  }

  if (nights > settings.max_nights) {
    return {
      available: false,
      reason: `Maximum stay is ${settings.max_nights} nights. Please contact us for longer stays.`,
    };
  }

  const today = todayIsoInPropertyTimeZone(settings.time_zone);
  if (range.checkIn < today) {
    return { available: false, reason: 'Check-in date is in the past.' };
  }

  const leadTimeRules = {
    leadTimeHours: settings.lead_time_hours,
    sameDayBookingEnabled: settings.same_day_booking_enabled,
    checkInTime: settings.check_in_time,
    timeZone: settings.time_zone,
  };
  if (!isWithinLeadTime(range.checkIn, leadTimeRules)) {
    return {
      available: false,
      reason: `Bookings must be made ${leadTimeDescription(leadTimeRules)}.`,
    };
  }

  const maxAdvance = addDaysIso(today, settings.max_advance_booking_days);
  if (range.checkIn > maxAdvance) {
    return {
      available: false,
      reason: `Bookings can only be made up to ${settings.max_advance_booking_days} days in advance.`,
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

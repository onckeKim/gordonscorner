import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { bookingRules } from '@/lib/config';

export interface DateRange {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD (exclusive)
}

/** Two half-open ranges [start, end) overlap iff a.start < b.end && b.start < a.end. */
function rangesOverlap(a: DateRange, b: { start_date: string; end_date: string }): boolean {
  return a.checkIn < b.end_date && b.start_date < a.checkOut;
}

export interface AvailabilityCheckResult {
  available: boolean;
  reason?: string;
}

/**
 * Validates a requested date range against the business rules (min nights,
 * max advance window) and against existing holds/bookings/blocked dates.
 * This is the single source of truth for "can these dates be booked" —
 * used both by the public availability endpoint and the booking-create
 * route (server-side, so it can't be bypassed by tampering with client JS).
 */
export async function checkAvailability(range: DateRange): Promise<AvailabilityCheckResult> {
  const checkIn = new Date(range.checkIn);
  const checkOut = new Date(range.checkOut);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return { available: false, reason: 'Invalid dates.' };
  }

  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (checkIn < today) {
    return { available: false, reason: 'Check-in date is in the past.' };
  }

  const maxAdvance = new Date(today);
  maxAdvance.setDate(maxAdvance.getDate() + bookingRules.maxAdvanceBookingDays);
  if (checkIn > maxAdvance) {
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

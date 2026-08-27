import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addHours, startOfDay } from 'date-fns';
import { siteConfig, propertyDetails, bookingRules } from '@/lib/config';

/**
 * All "what date/time is it right now" logic for the booking engine goes
 * through this module, anchored to `siteConfig.timeZone` — never the
 * server's runtime timezone (serverless functions typically run in UTC)
 * and never the guest's browser timezone. This is what keeps lead-time,
 * hold-expiry, and "is this date in the past" checks correct regardless of
 * where the request is served from or where the guest is browsing from.
 *
 * Dates that represent a calendar day only (check_in/check_out) are stored
 * and compared as plain 'YYYY-MM-DD' strings throughout the app — a
 * Postgres `date` column has no time component and no timezone, so string
 * comparison is inherently timezone-safe. This module exists for the
 * places that DO need to reason about "now" (lead time, hold expiry).
 */

/** The current instant, useful only for arithmetic — not for reading Y/M/D fields directly. */
export function now(): Date {
  return new Date();
}

/** Today's calendar date in the property's time zone, as 'YYYY-MM-DD'. */
export function todayIsoInPropertyTimeZone(): string {
  return formatInTimeZone(new Date(), siteConfig.timeZone, 'yyyy-MM-dd');
}

/** Converts a 'YYYY-MM-DD' + 'HH:mm' pair (property-local wall time) to a real instant. */
function propertyLocalToInstant(dateIso: string, time: string): Date {
  return fromZonedTime(`${dateIso}T${time}:00`, siteConfig.timeZone);
}

/**
 * Whether `checkInIso` satisfies the configured booking lead time, i.e. the
 * property's local check-in time on that date is at least
 * `bookingRules.leadTimeHours` from now. Bypassed entirely when
 * `bookingRules.sameDayBookingEnabled` is true.
 */
export function isWithinLeadTime(checkInIso: string): boolean {
  if (bookingRules.sameDayBookingEnabled) return true;
  const checkInInstant = propertyLocalToInstant(checkInIso, propertyDetails.checkInTime);
  const cutoff = addHours(now(), bookingRules.leadTimeHours);
  return checkInInstant.getTime() >= cutoff.getTime();
}

/** Human-readable explanation for the lead-time rule, used in validation error messages. */
export function leadTimeDescription(): string {
  if (bookingRules.sameDayBookingEnabled) return '';
  if (bookingRules.leadTimeHours % 24 === 0) {
    const days = bookingRules.leadTimeHours / 24;
    return `at least ${days} day${days === 1 ? '' : 's'} before check-in`;
  }
  return `at least ${bookingRules.leadTimeHours} hours before check-in`;
}

/** Start of "today" in the property's time zone, as a real Date instant — for < comparisons against instants. */
export function startOfTodayInPropertyTimeZone(): Date {
  return startOfDay(toZonedTime(new Date(), siteConfig.timeZone));
}

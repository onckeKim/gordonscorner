import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addHours, startOfDay } from 'date-fns';
import { siteConfig, propertyDetails, bookingRules } from '@/lib/config';

/**
 * All "what date/time is it right now" logic for the booking engine goes
 * through this module, anchored to the property's time zone — never the
 * server's runtime timezone (serverless functions typically run in UTC)
 * and never the guest's browser timezone. This is what keeps lead-time,
 * hold-expiry, and "is this date in the past" checks correct regardless of
 * where the request is served from or where the guest is browsing from.
 *
 * Every function here takes an optional override object so server callers
 * that already have the live, admin-configurable settings (src/lib/settings.ts)
 * can pass them through; callers with no override fall back to the static
 * config.ts defaults (used only where fetching settings isn't practical,
 * e.g. a quick client-side estimate).
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
export function todayIsoInPropertyTimeZone(timeZone: string = siteConfig.timeZone): string {
  return formatInTimeZone(new Date(), timeZone, 'yyyy-MM-dd');
}

/** Converts a 'YYYY-MM-DD' + 'HH:mm' pair (property-local wall time) to a real instant. */
function propertyLocalToInstant(dateIso: string, time: string, timeZone: string): Date {
  return fromZonedTime(`${dateIso}T${time}:00`, timeZone);
}

export interface LeadTimeRules {
  leadTimeHours?: number;
  sameDayBookingEnabled?: boolean;
  checkInTime?: string;
  timeZone?: string;
}

/**
 * Whether `checkInIso` satisfies the configured booking lead time, i.e. the
 * property's local check-in time on that date is at least the configured
 * number of hours from now. Bypassed entirely when same-day booking is
 * enabled.
 */
export function isWithinLeadTime(checkInIso: string, rules: LeadTimeRules = {}): boolean {
  const sameDayBookingEnabled = rules.sameDayBookingEnabled ?? bookingRules.sameDayBookingEnabled;
  if (sameDayBookingEnabled) return true;
  const leadTimeHours = rules.leadTimeHours ?? bookingRules.leadTimeHours;
  const checkInTime = rules.checkInTime ?? propertyDetails.checkInTime;
  const timeZone = rules.timeZone ?? siteConfig.timeZone;
  const checkInInstant = propertyLocalToInstant(checkInIso, checkInTime, timeZone);
  const cutoff = addHours(now(), leadTimeHours);
  return checkInInstant.getTime() >= cutoff.getTime();
}

/** Human-readable explanation for the lead-time rule, used in validation error messages. */
export function leadTimeDescription(rules: Pick<LeadTimeRules, 'leadTimeHours' | 'sameDayBookingEnabled'> = {}): string {
  const sameDayBookingEnabled = rules.sameDayBookingEnabled ?? bookingRules.sameDayBookingEnabled;
  if (sameDayBookingEnabled) return '';
  const leadTimeHours = rules.leadTimeHours ?? bookingRules.leadTimeHours;
  if (leadTimeHours % 24 === 0) {
    const days = leadTimeHours / 24;
    return `at least ${days} day${days === 1 ? '' : 's'} before check-in`;
  }
  return `at least ${leadTimeHours} hours before check-in`;
}

/** Start of "today" in the property's time zone, as a real Date instant — for < comparisons against instants. */
export function startOfTodayInPropertyTimeZone(timeZone: string = siteConfig.timeZone): Date {
  return startOfDay(toZonedTime(new Date(), timeZone));
}

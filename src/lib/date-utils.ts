/**
 * Pure calendar-date helpers for 'YYYY-MM-DD' strings, independent of any
 * timezone (no Date-object local-time parsing involved) — see
 * src/lib/timezone.ts for the "what time is it right now" helpers, which
 * are the only place actual timezone reasoning happens.
 */

export interface IsoDateParts {
  year: number;
  month: number; // 1-indexed
  day: number;
}

export function parseIsoDate(iso: string): IsoDateParts {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return { year, month, day };
}

export function isoDateToUtcMillis(iso: string): number {
  const { year, month, day } = parseIsoDate(iso);
  return Date.UTC(year, month - 1, day);
}

export function utcMillisToIsoDate(millis: number): string {
  return new Date(millis).toISOString().slice(0, 10);
}

/** Whole days between two 'YYYY-MM-DD' strings. */
export function daysBetweenIso(startIso: string, endIso: string): number {
  return Math.round((isoDateToUtcMillis(endIso) - isoDateToUtcMillis(startIso)) / (1000 * 60 * 60 * 24));
}

export function addDaysIso(iso: string, days: number): string {
  return utcMillisToIsoDate(isoDateToUtcMillis(iso) + days * 24 * 60 * 60 * 1000);
}

/** Each date from `startIso` (inclusive) to `endIso` (exclusive). */
export function isoDateRange(startIso: string, endIso: string): string[] {
  const end = isoDateToUtcMillis(endIso);
  const dates: string[] = [];
  let cursor = isoDateToUtcMillis(startIso);
  while (cursor < end) {
    dates.push(utcMillisToIsoDate(cursor));
    cursor += 24 * 60 * 60 * 1000;
  }
  return dates;
}

/** Day of week for a 'YYYY-MM-DD' string (0=Sunday ... 6=Saturday), timezone-independent. */
export function isoDateWeekday(iso: string): number {
  return new Date(isoDateToUtcMillis(iso)).getUTCDay();
}

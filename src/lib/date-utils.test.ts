import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  daysBetweenIso,
  isoDateRange,
  isoDateToUtcMillis,
  isoDateWeekday,
  parseIsoDate,
  utcMillisToIsoDate,
} from './date-utils';

describe('parseIsoDate', () => {
  it('splits a YYYY-MM-DD string into numeric parts', () => {
    expect(parseIsoDate('2026-03-05')).toEqual({ year: 2026, month: 3, day: 5 });
  });
});

describe('isoDateToUtcMillis / utcMillisToIsoDate', () => {
  it('round-trips a date through UTC millis', () => {
    const millis = isoDateToUtcMillis('2026-01-15');
    expect(utcMillisToIsoDate(millis)).toBe('2026-01-15');
  });

  it('is not affected by the host timezone (always anchors to UTC midnight)', () => {
    // Regression guard: naive `new Date('2026-01-15')` local-time parsing
    // would shift the date depending on the host's offset. This must not.
    expect(isoDateToUtcMillis('2026-01-15')).toBe(Date.UTC(2026, 0, 15));
  });
});

describe('daysBetweenIso', () => {
  it('counts whole days between two dates', () => {
    expect(daysBetweenIso('2026-03-01', '2026-03-05')).toBe(4);
  });

  it('returns 0 for the same date', () => {
    expect(daysBetweenIso('2026-03-01', '2026-03-01')).toBe(0);
  });

  it('returns a negative number when end is before start', () => {
    expect(daysBetweenIso('2026-03-05', '2026-03-01')).toBe(-4);
  });

  it('is correct across a month boundary', () => {
    expect(daysBetweenIso('2026-01-30', '2026-02-02')).toBe(3);
  });
});

describe('addDaysIso', () => {
  it('adds days within a month', () => {
    expect(addDaysIso('2026-03-01', 3)).toBe('2026-03-04');
  });

  it('rolls over a month boundary', () => {
    expect(addDaysIso('2026-01-30', 3)).toBe('2026-02-02');
  });

  it('rolls over a year boundary', () => {
    expect(addDaysIso('2025-12-30', 3)).toBe('2026-01-02');
  });

  it('handles negative days', () => {
    expect(addDaysIso('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('handles a leap-year February correctly', () => {
    expect(addDaysIso('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDaysIso('2025-02-28', 1)).toBe('2025-03-01');
  });
});

describe('isoDateRange', () => {
  it('includes the start date and excludes the end date', () => {
    expect(isoDateRange('2026-03-01', '2026-03-04')).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
    ]);
  });

  it('returns an empty array when start equals end', () => {
    expect(isoDateRange('2026-03-01', '2026-03-01')).toEqual([]);
  });

  it('returns exactly one night for a minimal 1-night span', () => {
    expect(isoDateRange('2026-03-01', '2026-03-02')).toEqual(['2026-03-01']);
  });
});

describe('isoDateWeekday', () => {
  it('identifies a known Saturday', () => {
    // 2026-01-03 is a Saturday.
    expect(isoDateWeekday('2026-01-03')).toBe(6);
  });

  it('identifies a known Sunday', () => {
    expect(isoDateWeekday('2026-01-04')).toBe(0);
  });

  it('identifies a known Friday', () => {
    expect(isoDateWeekday('2026-01-02')).toBe(5);
  });
});

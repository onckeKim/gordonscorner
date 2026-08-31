import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isWithinLeadTime, leadTimeDescription, todayIsoInPropertyTimeZone } from './timezone';

// Africa/Johannesburg is a fixed UTC+2 offset (no DST), so these instants are
// deterministic regardless of the host machine's own timezone.
const TIME_ZONE = 'Africa/Johannesburg';

describe('leadTimeDescription', () => {
  it('is blank when same-day booking is enabled', () => {
    expect(leadTimeDescription({ sameDayBookingEnabled: true, leadTimeHours: 48 })).toBe('');
  });

  it('describes a whole-day lead time in days', () => {
    expect(leadTimeDescription({ sameDayBookingEnabled: false, leadTimeHours: 48 })).toBe(
      'at least 2 days before check-in',
    );
  });

  it('uses singular "day" for exactly 24 hours', () => {
    expect(leadTimeDescription({ sameDayBookingEnabled: false, leadTimeHours: 24 })).toBe(
      'at least 1 day before check-in',
    );
  });

  it('describes a non-whole-day lead time in hours', () => {
    expect(leadTimeDescription({ sameDayBookingEnabled: false, leadTimeHours: 6 })).toBe(
      'at least 6 hours before check-in',
    );
  });
});

describe('isWithinLeadTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('always allows booking when same-day booking is enabled, regardless of date', () => {
    vi.setSystemTime(new Date('2026-06-10T12:00:00Z'));
    expect(
      isWithinLeadTime('2026-06-10', {
        sameDayBookingEnabled: true,
        leadTimeHours: 999,
        checkInTime: '14:00',
        timeZone: TIME_ZONE,
      }),
    ).toBe(true);
  });

  it('accepts a check-in exactly at the lead-time boundary', () => {
    // Check-in 2026-06-10 14:00 Africa/Johannesburg (UTC+2) = 2026-06-10T12:00:00Z.
    // Exactly 24h before that instant satisfies a 24h lead time.
    vi.setSystemTime(new Date('2026-06-09T12:00:00Z'));
    expect(
      isWithinLeadTime('2026-06-10', {
        sameDayBookingEnabled: false,
        leadTimeHours: 24,
        checkInTime: '14:00',
        timeZone: TIME_ZONE,
      }),
    ).toBe(true);
  });

  it('rejects a check-in one second inside the lead-time boundary', () => {
    vi.setSystemTime(new Date('2026-06-09T12:00:01Z'));
    expect(
      isWithinLeadTime('2026-06-10', {
        sameDayBookingEnabled: false,
        leadTimeHours: 24,
        checkInTime: '14:00',
        timeZone: TIME_ZONE,
      }),
    ).toBe(false);
  });

  it('rejects a check-in date that has already passed', () => {
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(
      isWithinLeadTime('2026-06-10', {
        sameDayBookingEnabled: false,
        leadTimeHours: 24,
        checkInTime: '14:00',
        timeZone: TIME_ZONE,
      }),
    ).toBe(false);
  });

  it('accepts a check-in comfortably beyond the required lead time', () => {
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
    expect(
      isWithinLeadTime('2026-06-10', {
        sameDayBookingEnabled: false,
        leadTimeHours: 24,
        checkInTime: '14:00',
        timeZone: TIME_ZONE,
      }),
    ).toBe(true);
  });
});

describe('todayIsoInPropertyTimeZone', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rolls over to the next calendar day in the property timezone before UTC midnight', () => {
    // 23:30 UTC on the 10th is already 01:30 on the 11th in UTC+2.
    vi.setSystemTime(new Date('2026-06-10T23:30:00Z'));
    expect(todayIsoInPropertyTimeZone(TIME_ZONE)).toBe('2026-06-11');
  });

  it('is still the same calendar day just after UTC midnight', () => {
    // 00:30 UTC on the 11th is 02:30 on the 11th in UTC+2 — same day.
    vi.setSystemTime(new Date('2026-06-11T00:30:00Z'));
    expect(todayIsoInPropertyTimeZone(TIME_ZONE)).toBe('2026-06-11');
  });
});

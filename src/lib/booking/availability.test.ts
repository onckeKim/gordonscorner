import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Settings, DateRateOverride } from '@/types/database';

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(),
  getDateRateOverrides: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(),
}));

import { getSettings, getDateRateOverrides } from '@/lib/settings';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { checkAvailability } from './availability';

const TIME_ZONE = 'Africa/Johannesburg'; // fixed UTC+2, no DST

function baseSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: true,
    property_name: "Gordon's Corner",
    currency: 'ZAR',
    time_zone: TIME_ZONE,
    default_nightly_rate: 1850,
    weekend_nightly_rate: 2100,
    deposit_percentage: 50,
    min_nights: 2,
    max_nights: 21,
    guest_capacity: 6,
    lead_time_hours: 24,
    same_day_booking_enabled: false,
    max_advance_booking_days: 365,
    hold_period_hours: 24,
    tax_rate_percent: 0,
    cleaning_fee: 450,
    service_fee: 0,
    security_deposit: 0,
    payment_deadline_hours: 24,
    balance_payment_deadline_days: 7,
    cancellation_policy: 'Test policy.',
    admin_notification_email: 'admin@example.com',
    check_in_time: '14:00',
    check_out_time: '10:00',
    ga4_measurement_id: null,
    gtm_container_id: null,
    clarity_project_id: null,
    fb_pixel_id: null,
    gsc_verification_code: null,
    google_business_profile_url: null,
    google_place_id: null,
    latitude: null,
    longitude: null,
    service_area: null,
    default_og_image_url: null,
    updated_at: new Date(0).toISOString(),
    updated_by: null,
    ...overrides,
  };
}

/** Fakes the `.from('public_unavailable_ranges').select('*')` call `checkAvailability` makes. */
function mockUnavailableRanges(ranges: { start_date: string; end_date: string }[], error: { message: string } | null = null) {
  const fakeClient = {
    from: () => ({
      select: async () => (error ? { data: null, error } : { data: ranges, error: null }),
    }),
  };
  vi.mocked(createAdminSupabaseClient).mockReturnValue(fakeClient as unknown as ReturnType<typeof createAdminSupabaseClient>);
}

describe('checkAvailability', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // "Now" = 2026-06-01 00:00 UTC, well before every test's requested dates.
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
    vi.mocked(getSettings).mockResolvedValue(baseSettings());
    vi.mocked(getDateRateOverrides).mockResolvedValue([]);
    mockUnavailableRanges([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('rejects a stay shorter than the configured minimum nights', async () => {
    // 1 night, min_nights defaults to 2.
    const result = await checkAvailability({ checkIn: '2026-07-10', checkOut: '2026-07-11' });
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/minimum stay/i);
  });

  it('accepts a stay meeting the minimum-night requirement', async () => {
    const result = await checkAvailability({ checkIn: '2026-07-10', checkOut: '2026-07-12' });
    expect(result.available).toBe(true);
  });

  it('rejects a stay longer than the configured maximum nights', async () => {
    vi.mocked(getSettings).mockResolvedValue(baseSettings({ max_nights: 5 }));
    const result = await checkAvailability({ checkIn: '2026-07-10', checkOut: '2026-07-20' }); // 10 nights
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/maximum stay/i);
  });

  it('rejects a check-in date that has already passed', async () => {
    const result = await checkAvailability({ checkIn: '2026-05-01', checkOut: '2026-05-03' });
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/past/i);
  });

  it('rejects a check-in date inside the required lead time', async () => {
    // "Now" is 2026-06-01T00:00Z; checking in same-day is inside a 24h lead time.
    const result = await checkAvailability({ checkIn: '2026-06-01', checkOut: '2026-06-03' });
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/24 hours|1 day/i);
  });

  it('allows a same-day check-in when same-day booking is enabled', async () => {
    vi.mocked(getSettings).mockResolvedValue(baseSettings({ same_day_booking_enabled: true }));
    const result = await checkAvailability({ checkIn: '2026-06-01', checkOut: '2026-06-03' });
    expect(result.available).toBe(true);
  });

  it('rejects a check-in beyond the maximum advance booking window', async () => {
    vi.mocked(getSettings).mockResolvedValue(baseSettings({ max_advance_booking_days: 30 }));
    const result = await checkAvailability({ checkIn: '2027-01-01', checkOut: '2027-01-03' });
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/advance/i);
  });

  it('rejects dates that overlap an existing booking/hold/blocked range', async () => {
    mockUnavailableRanges([{ start_date: '2026-07-09', end_date: '2026-07-13' }]);
    const result = await checkAvailability({ checkIn: '2026-07-10', checkOut: '2026-07-12' });
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/unavailable/i);
  });

  it('allows dates that exactly abut (do not overlap) an existing unavailable range', async () => {
    // Existing range is [07-05, 07-10); a new stay starting exactly at
    // checkout (07-10) must be allowed — half-open ranges, not off-by-one.
    mockUnavailableRanges([{ start_date: '2026-07-05', end_date: '2026-07-10' }]);
    const result = await checkAvailability({ checkIn: '2026-07-10', checkOut: '2026-07-12' });
    expect(result.available).toBe(true);
  });

  it('rejects dates that partially overlap the tail end of an unavailable range', async () => {
    mockUnavailableRanges([{ start_date: '2026-07-05', end_date: '2026-07-11' }]);
    const result = await checkAvailability({ checkIn: '2026-07-10', checkOut: '2026-07-15' });
    expect(result.available).toBe(false);
  });

  it('applies a seasonal minimum-nights override only within its date range', async () => {
    const override: Pick<DateRateOverride, 'start_date' | 'end_date' | 'label' | 'min_nights'> = {
      start_date: '2026-12-20',
      end_date: '2027-01-05',
      label: 'Festive season',
      min_nights: 5,
    };
    vi.mocked(getDateRateOverrides).mockResolvedValue([override as DateRateOverride]);

    const insideSeason = await checkAvailability({ checkIn: '2026-12-24', checkOut: '2026-12-27' }); // 3 nights, needs 5
    expect(insideSeason.available).toBe(false);
    expect(insideSeason.reason).toMatch(/festive season/i);

    const outsideSeason = await checkAvailability({ checkIn: '2026-11-10', checkOut: '2026-11-13' }); // 3 nights, ok outside season
    expect(outsideSeason.available).toBe(true);
  });

  it('rejects malformed date strings without touching the database', async () => {
    const result = await checkAvailability({ checkIn: 'not-a-date', checkOut: '2026-07-12' });
    expect(result.available).toBe(false);
    expect(createAdminSupabaseClient).not.toHaveBeenCalled();
  });

  it('throws when the unavailable-ranges query fails, rather than silently reporting available', async () => {
    mockUnavailableRanges([], { message: 'connection reset' });
    await expect(checkAvailability({ checkIn: '2026-07-10', checkOut: '2026-07-12' })).rejects.toThrow(
      /failed to check availability/i,
    );
  });
});

import 'server-only';
import { cache } from 'react';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit';
import {
  siteConfig,
  propertyDetails,
  bookingRules as defaultBookingRules,
  pricingConfig as defaultPricingConfig,
} from '@/lib/config';
import type { Settings, DateRateOverride } from '@/types/database';
import type { PricingInputs } from '@/lib/pricing';

/**
 * DB-backed settings, singleton row (id = true, migration 0007). Falls back
 * to the static defaults in src/lib/config.ts if the row is somehow missing
 * (it's seeded by the migration, so this is a belt-and-braces fallback, not
 * the normal path).
 */
function fallbackSettings(): Settings {
  return {
    id: true,
    property_name: siteConfig.propertyName,
    currency: defaultBookingRules.currency,
    time_zone: siteConfig.timeZone,
    default_nightly_rate: defaultPricingConfig.standardNightlyRateZar,
    weekend_nightly_rate: defaultPricingConfig.weekendNightlyRateZar,
    deposit_percentage: defaultBookingRules.depositRate * 100,
    min_nights: defaultBookingRules.minNights,
    max_nights: defaultBookingRules.maxNights,
    guest_capacity: propertyDetails.maxGuests,
    lead_time_hours: defaultBookingRules.leadTimeHours,
    same_day_booking_enabled: defaultBookingRules.sameDayBookingEnabled,
    max_advance_booking_days: defaultBookingRules.maxAdvanceBookingDays,
    hold_period_hours: defaultBookingRules.holdExpiryHours,
    tax_rate_percent: 0,
    cleaning_fee: defaultPricingConfig.cleaningFeeZar,
    service_fee: defaultPricingConfig.serviceFeeZar,
    security_deposit: defaultPricingConfig.securityDepositZar,
    payment_deadline_hours: defaultBookingRules.holdExpiryHours,
    balance_payment_deadline_days: 7,
    cancellation_policy:
      'Full refund of the deposit if cancelled 14 or more days before check-in. No refund of the deposit within 14 days of check-in.',
    admin_notification_email: 'admin@gordonscorner.co.za',
    check_in_time: propertyDetails.checkInTime,
    check_out_time: propertyDetails.checkOutTime,
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
  };
}

/**
 * Cached per-request (React's cache()) so multiple reads within the same
 * server render/route handler only hit the DB once.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const db = createAdminSupabaseClient();
  const { data, error } = await db.from('settings').select('*').eq('id', true).maybeSingle();
  if (error || !data) {
    return fallbackSettings();
  }
  return data;
});

/** The subset of settings safe to expose to guests (no admin notification email etc). */
export interface PublicSettings {
  propertyName: string;
  currency: string;
  timeZone: string;
  defaultNightlyRate: number;
  weekendNightlyRate: number | null;
  depositPercentage: number;
  minNights: number;
  maxNights: number;
  guestCapacity: number;
  leadTimeHours: number;
  sameDayBookingEnabled: boolean;
  maxAdvanceBookingDays: number;
  taxRatePercent: number;
  cleaningFee: number;
  serviceFee: number;
  securityDeposit: number;
  checkInTime: string;
  checkOutTime: string;
}

export function toPublicSettings(settings: Settings): PublicSettings {
  return {
    propertyName: settings.property_name,
    currency: settings.currency,
    timeZone: settings.time_zone,
    defaultNightlyRate: settings.default_nightly_rate,
    weekendNightlyRate: settings.weekend_nightly_rate,
    depositPercentage: settings.deposit_percentage,
    minNights: settings.min_nights,
    maxNights: settings.max_nights,
    guestCapacity: settings.guest_capacity,
    leadTimeHours: settings.lead_time_hours,
    sameDayBookingEnabled: settings.same_day_booking_enabled,
    maxAdvanceBookingDays: settings.max_advance_booking_days,
    taxRatePercent: settings.tax_rate_percent,
    cleaningFee: settings.cleaning_fee,
    serviceFee: settings.service_fee,
    securityDeposit: settings.security_deposit,
    checkInTime: settings.check_in_time,
    checkOutTime: settings.check_out_time,
  };
}

/** Active date-specific/seasonal rate + min-stay overrides, oldest-created first (first match wins, same precedence the old hardcoded array documented). */
export const getDateRateOverrides = cache(async (): Promise<DateRateOverride[]> => {
  const db = createAdminSupabaseClient();
  const { data } = await db.from('date_rate_overrides').select('*').order('created_at', { ascending: true });
  return data ?? [];
});

export interface RateOverrideInput {
  startDate: string;
  endDate: string;
  label?: string;
  nightlyRate?: number;
  minNights?: number;
}

/** Admin-only. Creates a date-specific/seasonal rate or minimum-stay override. */
export async function createRateOverride(
  actor: { id: string; email: string },
  input: RateOverrideInput,
): Promise<DateRateOverride> {
  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from('date_rate_overrides')
    .insert({
      start_date: input.startDate,
      end_date: input.endDate,
      label: input.label ?? null,
      nightly_rate: input.nightlyRate ?? null,
      min_nights: input.minNights ?? null,
      created_by: actor.id,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not create rate override.');
  }

  await writeAuditLog(actor, {
    action: 'rate_override.create',
    recordType: 'rate_override',
    recordId: data.id,
    changes: { after: data },
  });

  return data;
}

/** Admin-only. Removes a date-specific/seasonal rate or minimum-stay override. */
export async function deleteRateOverride(actor: { id: string; email: string }, id: string): Promise<void> {
  const db = createAdminSupabaseClient();
  const { data: existing } = await db.from('date_rate_overrides').select('*').eq('id', id).maybeSingle();
  const { error } = await db.from('date_rate_overrides').delete().eq('id', id);
  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog(actor, {
    action: 'rate_override.delete',
    recordType: 'rate_override',
    recordId: id,
    changes: { deleted: existing },
  });
}

export function toPricingInputs(settings: Settings, overrides: DateRateOverride[]): PricingInputs {
  return {
    standardNightlyRate: settings.default_nightly_rate,
    weekendNightlyRate: settings.weekend_nightly_rate,
    cleaningFee: settings.cleaning_fee,
    serviceFee: settings.service_fee,
    taxRatePercent: settings.tax_rate_percent,
    securityDeposit: settings.security_deposit,
    depositRate: settings.deposit_percentage / 100,
    currency: settings.currency,
    dateOverrides: overrides,
  };
}

/** Convenience: fetches live settings + rate overrides and returns pricing.ts-ready inputs. */
export async function getEffectivePricingInputs(): Promise<PricingInputs> {
  const [settings, overrides] = await Promise.all([getSettings(), getDateRateOverrides()]);
  return toPricingInputs(settings, overrides);
}

export type SettingsUpdate = Partial<
  Omit<Settings, 'id' | 'updated_at' | 'updated_by'>
>;

/** Admin-only. Persists a settings change and writes an audit log entry. */
export async function updateSettings(
  actor: { id: string; email: string },
  patch: SettingsUpdate,
): Promise<Settings> {
  const db = createAdminSupabaseClient();
  const before = await getSettings();

  const { data, error } = await db
    .from('settings')
    .update({ ...patch, updated_by: actor.id })
    .eq('id', true)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not update settings.');
  }

  await writeAuditLog(actor, {
    action: 'settings.update',
    recordType: 'settings',
    recordId: 'singleton',
    changes: { before, after: data },
  });

  return data;
}

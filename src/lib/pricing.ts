import { bookingRules, pricingConfig } from '@/lib/config';
import { isoDateRange, isoDateWeekday } from '@/lib/date-utils';
import type { DateRateOverride } from '@/types/database';

/**
 * The full pricing engine. Isomorphic (no 'server-only') so the booking
 * form can show a live estimate in the browser — but the server is always
 * the source of truth: `createBookingRequest` (src/lib/booking/workflow.ts)
 * calls this function itself, passing the live admin-configured settings
 * and date-rate overrides, and ignores any amounts the client sends, so a
 * tampered browser request can never change what a guest is actually
 * charged. A caller with no `PricingInputs` falls back to the static
 * defaults in config.ts (used only for an initial client-side estimate
 * before settings have loaded).
 */

export type NightlyRateType = 'standard' | 'weekend' | 'seasonal';

export interface NightlyRateEntry {
  date: string; // YYYY-MM-DD
  rateZar: number;
  rateType: NightlyRateType;
  label?: string;
}

export interface StayPricing {
  nights: number;
  nightlyBreakdown: NightlyRateEntry[];
  /** Sum of nightly rates, before fees/discount. */
  accommodationSubtotal: number;
  cleaningFeeAmount: number;
  serviceFeeAmount: number;
  discountAmount: number;
  taxAmount: number;
  /** accommodationSubtotal + fees + tax - discount. What the deposit/balance split is based on. */
  totalAccommodationPrice: number;
  depositAmount: number;
  balanceAmount: number;
  /** Refundable security/breakage deposit — shown, not part of the split above. */
  securityDepositAmount: number;
  currency: string;
}

/** Live, admin-configurable values a caller can pass instead of the config.ts defaults. */
export interface PricingInputs {
  standardNightlyRate?: number;
  weekendNightlyRate?: number | null;
  cleaningFee?: number;
  serviceFee?: number;
  discount?: number;
  taxRatePercent?: number;
  securityDeposit?: number;
  depositRate?: number;
  currency?: string;
  /** Date-specific/seasonal overrides, first match (by array order) wins. */
  dateOverrides?: Pick<DateRateOverride, 'start_date' | 'end_date' | 'label' | 'nightly_rate'>[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Friday and Saturday nights count as "weekend" nights. */
function isWeekendNight(dateIso: string): boolean {
  const day = isoDateWeekday(dateIso);
  return day === 5 || day === 6;
}

function findOverride(dateIso: string, overrides: PricingInputs['dateOverrides']) {
  return overrides?.find(
    (r) => r.nightly_rate != null && dateIso >= r.start_date && dateIso < r.end_date,
  );
}

function getNightlyRate(dateIso: string, inputs: Required<Omit<PricingInputs, 'depositRate' | 'currency'>>): NightlyRateEntry {
  const override = findOverride(dateIso, inputs.dateOverrides);
  if (override) {
    return { date: dateIso, rateZar: override.nightly_rate as number, rateType: 'seasonal', label: override.label ?? undefined };
  }
  if (inputs.weekendNightlyRate != null && isWeekendNight(dateIso)) {
    return { date: dateIso, rateZar: inputs.weekendNightlyRate, rateType: 'weekend' };
  }
  return { date: dateIso, rateZar: inputs.standardNightlyRate, rateType: 'standard' };
}

export function calculateStayPricing(checkIn: string, checkOut: string, overrides?: PricingInputs): StayPricing {
  const inputs = {
    standardNightlyRate: overrides?.standardNightlyRate ?? pricingConfig.standardNightlyRateZar,
    weekendNightlyRate: overrides?.weekendNightlyRate ?? pricingConfig.weekendNightlyRateZar,
    cleaningFee: overrides?.cleaningFee ?? pricingConfig.cleaningFeeZar,
    serviceFee: overrides?.serviceFee ?? pricingConfig.serviceFeeZar,
    discount: overrides?.discount ?? pricingConfig.discountZar,
    taxRatePercent: overrides?.taxRatePercent ?? 0,
    securityDeposit: overrides?.securityDeposit ?? pricingConfig.securityDepositZar,
    dateOverrides: overrides?.dateOverrides ?? [],
  };
  const depositRate = overrides?.depositRate ?? bookingRules.depositRate;
  const currency = overrides?.currency ?? bookingRules.currency;

  const nightlyBreakdown = isoDateRange(checkIn, checkOut).map((d) => getNightlyRate(d, inputs));
  const accommodationSubtotal = round2(nightlyBreakdown.reduce((sum, n) => sum + n.rateZar, 0));
  const cleaningFeeAmount = inputs.cleaningFee;
  const serviceFeeAmount = inputs.serviceFee;
  const discountAmount = inputs.discount;
  const taxableAmount = accommodationSubtotal + cleaningFeeAmount + serviceFeeAmount - discountAmount;
  const taxAmount = round2(taxableAmount * (inputs.taxRatePercent / 100));
  const totalAccommodationPrice = round2(taxableAmount + taxAmount);
  const depositAmount = round2(totalAccommodationPrice * depositRate);
  const balanceAmount = round2(totalAccommodationPrice - depositAmount);

  return {
    nights: nightlyBreakdown.length,
    nightlyBreakdown,
    accommodationSubtotal,
    cleaningFeeAmount,
    serviceFeeAmount,
    discountAmount,
    taxAmount,
    totalAccommodationPrice,
    depositAmount,
    balanceAmount,
    securityDepositAmount: inputs.securityDeposit,
    currency,
  };
}

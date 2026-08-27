import { bookingRules, pricingConfig } from '@/lib/config';
import { isoDateRange, isoDateWeekday } from '@/lib/date-utils';

/**
 * The full pricing engine. Isomorphic (no 'server-only') so the booking
 * form can show a live estimate in the browser — but the server is always
 * the source of truth: `createBookingRequest` (src/lib/booking/workflow.ts)
 * calls this function itself and ignores any amounts the client sends, so a
 * tampered browser request can never change what a guest is actually
 * charged.
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
  /** accommodationSubtotal + fees - discount. What the 50/50 split is based on. */
  totalAccommodationPrice: number;
  depositAmount: number;
  balanceAmount: number;
  /** Refundable security/breakage deposit — shown, not part of the split above. */
  securityDepositAmount: number;
  currency: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Friday and Saturday nights count as "weekend" nights. */
function isWeekendNight(dateIso: string): boolean {
  const day = isoDateWeekday(dateIso);
  return day === 5 || day === 6;
}

function findSeasonalRate(dateIso: string) {
  return pricingConfig.seasonalRates.find((r) => dateIso >= r.startDate && dateIso <= r.endDate);
}

function getNightlyRate(dateIso: string): NightlyRateEntry {
  const seasonal = findSeasonalRate(dateIso);
  if (seasonal) {
    return { date: dateIso, rateZar: seasonal.nightlyRateZar, rateType: 'seasonal', label: seasonal.label };
  }
  if (pricingConfig.weekendNightlyRateZar != null && isWeekendNight(dateIso)) {
    return { date: dateIso, rateZar: pricingConfig.weekendNightlyRateZar, rateType: 'weekend' };
  }
  return { date: dateIso, rateZar: pricingConfig.standardNightlyRateZar, rateType: 'standard' };
}

export function calculateStayPricing(checkIn: string, checkOut: string): StayPricing {
  const nightlyBreakdown = isoDateRange(checkIn, checkOut).map(getNightlyRate);
  const accommodationSubtotal = round2(nightlyBreakdown.reduce((sum, n) => sum + n.rateZar, 0));
  const cleaningFeeAmount = pricingConfig.cleaningFeeZar;
  const serviceFeeAmount = pricingConfig.serviceFeeZar;
  const discountAmount = pricingConfig.discountZar;
  const totalAccommodationPrice = round2(
    accommodationSubtotal + cleaningFeeAmount + serviceFeeAmount - discountAmount,
  );
  const depositAmount = round2(totalAccommodationPrice * bookingRules.depositRate);
  const balanceAmount = round2(totalAccommodationPrice - depositAmount);

  return {
    nights: nightlyBreakdown.length,
    nightlyBreakdown,
    accommodationSubtotal,
    cleaningFeeAmount,
    serviceFeeAmount,
    discountAmount,
    totalAccommodationPrice,
    depositAmount,
    balanceAmount,
    securityDepositAmount: pricingConfig.securityDepositZar,
    currency: bookingRules.currency,
  };
}

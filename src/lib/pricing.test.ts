import { describe, expect, it } from 'vitest';
import { calculateStayPricing } from './pricing';

describe('calculateStayPricing', () => {
  it('uses the standard nightly rate for a weekday-only stay', () => {
    // 2026-01-05 (Mon) -> 2026-01-07 (Wed): two weeknight stays.
    const pricing = calculateStayPricing('2026-01-05', '2026-01-07', {
      standardNightlyRate: 1000,
      weekendNightlyRate: 1500,
      cleaningFee: 0,
      serviceFee: 0,
      discount: 0,
      securityDeposit: 0,
    });
    expect(pricing.nights).toBe(2);
    expect(pricing.nightlyBreakdown.every((n) => n.rateType === 'standard')).toBe(true);
    expect(pricing.accommodationSubtotal).toBe(2000);
  });

  it('charges the weekend rate for Friday and Saturday nights', () => {
    // 2026-01-02 (Fri) -> 2026-01-04 (Sun): Fri + Sat nights.
    const pricing = calculateStayPricing('2026-01-02', '2026-01-04', {
      standardNightlyRate: 1000,
      weekendNightlyRate: 1500,
      cleaningFee: 0,
      serviceFee: 0,
      discount: 0,
      securityDeposit: 0,
    });
    expect(pricing.nightlyBreakdown.map((n) => n.rateType)).toEqual(['weekend', 'weekend']);
    expect(pricing.accommodationSubtotal).toBe(3000);
  });

  it('falls back to the standard rate on weekends when no weekend rate is configured', () => {
    const pricing = calculateStayPricing('2026-01-02', '2026-01-04', {
      standardNightlyRate: 1000,
      weekendNightlyRate: null,
      cleaningFee: 0,
      serviceFee: 0,
      discount: 0,
      securityDeposit: 0,
    });
    expect(pricing.nightlyBreakdown.every((n) => n.rateType === 'standard')).toBe(true);
    expect(pricing.accommodationSubtotal).toBe(2000);
  });

  it('gives a seasonal date-range override precedence over the weekend rate', () => {
    const pricing = calculateStayPricing('2026-01-02', '2026-01-04', {
      standardNightlyRate: 1000,
      weekendNightlyRate: 1500,
      cleaningFee: 0,
      serviceFee: 0,
      discount: 0,
      securityDeposit: 0,
      dateOverrides: [
        { start_date: '2026-01-01', end_date: '2026-01-10', label: 'Peak season', nightly_rate: 5000 },
      ],
    });
    expect(pricing.nightlyBreakdown.every((n) => n.rateType === 'seasonal')).toBe(true);
    expect(pricing.accommodationSubtotal).toBe(10000);
  });

  it('adds cleaning and service fees, and subtracts a flat discount', () => {
    const pricing = calculateStayPricing('2026-01-05', '2026-01-07', {
      standardNightlyRate: 1000,
      weekendNightlyRate: 1000,
      cleaningFee: 450,
      serviceFee: 100,
      discount: 200,
      securityDeposit: 0,
    });
    // 2 nights * 1000 + 450 + 100 - 200 = 2350
    expect(pricing.accommodationSubtotal).toBe(2000);
    expect(pricing.cleaningFeeAmount).toBe(450);
    expect(pricing.serviceFeeAmount).toBe(100);
    expect(pricing.discountAmount).toBe(200);
    expect(pricing.totalAccommodationPrice).toBe(2350);
  });

  it('applies a percentage tax on top of the discounted subtotal', () => {
    const pricing = calculateStayPricing('2026-01-05', '2026-01-07', {
      standardNightlyRate: 1000,
      weekendNightlyRate: 1000,
      cleaningFee: 0,
      serviceFee: 0,
      discount: 0,
      securityDeposit: 0,
      taxRatePercent: 15,
    });
    // 2000 * 0.15 = 300
    expect(pricing.taxAmount).toBe(300);
    expect(pricing.totalAccommodationPrice).toBe(2300);
  });

  it('splits the total into a 50% deposit and 50% balance by default', () => {
    const pricing = calculateStayPricing('2026-01-05', '2026-01-07', {
      standardNightlyRate: 1000,
      weekendNightlyRate: 1000,
      cleaningFee: 0,
      serviceFee: 0,
      discount: 0,
      securityDeposit: 0,
    });
    expect(pricing.totalAccommodationPrice).toBe(2000);
    expect(pricing.depositAmount).toBe(1000);
    expect(pricing.balanceAmount).toBe(1000);
    expect(pricing.depositAmount + pricing.balanceAmount).toBe(pricing.totalAccommodationPrice);
  });

  it('honours a custom deposit rate', () => {
    const pricing = calculateStayPricing('2026-01-05', '2026-01-07', {
      standardNightlyRate: 1000,
      weekendNightlyRate: 1000,
      cleaningFee: 0,
      serviceFee: 0,
      discount: 0,
      securityDeposit: 0,
      depositRate: 0.3,
    });
    expect(pricing.depositAmount).toBe(600); // 30% of 2000
    expect(pricing.balanceAmount).toBe(1400);
  });

  it('reports the security/breakage deposit separately from the accommodation split', () => {
    const pricing = calculateStayPricing('2026-01-05', '2026-01-07', {
      standardNightlyRate: 1000,
      weekendNightlyRate: 1000,
      cleaningFee: 0,
      serviceFee: 0,
      discount: 0,
      securityDeposit: 2500,
    });
    expect(pricing.securityDepositAmount).toBe(2500);
    expect(pricing.totalAccommodationPrice).toBe(2000);
  });

  it('rounds monetary amounts to 2 decimal places', () => {
    const pricing = calculateStayPricing('2026-01-05', '2026-01-06', {
      standardNightlyRate: 999.995,
      weekendNightlyRate: 999.995,
      cleaningFee: 0,
      serviceFee: 0,
      discount: 0,
      securityDeposit: 0,
    });
    expect(Number.isInteger(pricing.accommodationSubtotal * 100)).toBe(true);
  });
});

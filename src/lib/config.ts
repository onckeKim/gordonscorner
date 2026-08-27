/**
 * Central business configuration for Gordon's Corner.
 *
 * Every business-specific value (pricing, rules, contact details) lives here
 * so the rest of the codebase never hardcodes them. Edit this file to
 * re-configure the property without touching booking logic.
 */

export const siteConfig = {
  propertyName: "Gordon's Corner",
  tagline: 'A quiet corner, beautifully kept.',
  description:
    "Gordon's Corner is a stylish short-stay retreat — book your dates, " +
    'reserve with a secure deposit, and settle in.',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  /** Public-facing contact email shown on the site — distinct from the
   * server-only ADMIN_NOTIFICATION_EMAIL env var used for internal alerts. */
  contactEmail: 'hello@gordonscorner.co.za',
  contactPhone: '+27 82 000 0000',
  address: 'Hermanus, Western Cape, South Africa',
} as const;

export const bookingRules = {
  /** Minimum number of consecutive nights per booking. */
  minNights: 2,
  /** Maximum nights a single request may span (guardrail, adjust freely). */
  maxNights: 21,
  /** Fraction of the total stay cost due as a deposit once accepted. */
  depositRate: 0.5,
  /** Hours an accepted-but-unpaid booking holds its dates before expiring. */
  holdExpiryHours: 48,
  /** How far in the future guests may book. */
  maxAdvanceBookingDays: 365,
  /** Currency for all monetary values. */
  currency: 'ZAR' as const,
  /** Nightly rate used to compute totals (ZAR). Adjust seasonally as needed. */
  nightlyRateZar: 1850,
} as const;

export const paymentConfig = {
  provider: (process.env.PAYMENT_PROVIDER ?? 'dev') as
    | 'payfast'
    | 'peach'
    | 'yoco'
    | 'dev',
} as const;

export function calculateStayTotal(nights: number): {
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
} {
  const totalAmount = Math.round(nights * bookingRules.nightlyRateZar * 100) / 100;
  const depositAmount = Math.round(totalAmount * bookingRules.depositRate * 100) / 100;
  const balanceAmount = Math.round((totalAmount - depositAmount) * 100) / 100;
  return { totalAmount, depositAmount, balanceAmount };
}

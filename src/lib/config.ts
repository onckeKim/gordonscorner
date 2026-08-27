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
  /** Digits only, international format, no leading +, for wa.me links. */
  whatsappNumber: '27820000000',
  address: 'Hermanus, Western Cape, South Africa',
  addressLine1: '12 Gordon Street',
  addressLine2: 'Hermanus, 7200',
  addressCountry: 'South Africa',
  /** Placeholder — replace with a real embed URL (Google Maps "Share > Embed") once the address is confirmed. */
  mapEmbedUrl: null as string | null,
  /** Shown on the guest booking status page only once a booking is confirmed. */
  emergencyContactName: 'Gordon (property manager)',
  emergencyContactPhone: '+27 82 111 1111',
} as const;

/** Physical facts about the property — capacity, layout, check-in window. */
export const propertyDetails = {
  maxGuests: 6,
  bedrooms: 2,
  beds: 3,
  bathrooms: 1,
  checkInTime: '14:00',
  checkOutTime: '10:00',
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
  /** Flat additional fee added to every booking (e.g. cleaning). 0 = none. */
  additionalFeeZar: 0,
  additionalFeeLabel: 'Cleaning fee',
  /** Flat discount subtracted from every booking total. 0 = none. */
  discountZar: 0,
  discountLabel: 'Discount',
} as const;

export const paymentConfig = {
  provider: (process.env.PAYMENT_PROVIDER ?? 'dev') as
    | 'payfast'
    | 'peach'
    | 'yoco'
    | 'dev',
} as const;

export function calculateStayTotal(nights: number): {
  subtotalAmount: number;
  additionalFeeAmount: number;
  discountAmount: number;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
} {
  const subtotalAmount = Math.round(nights * bookingRules.nightlyRateZar * 100) / 100;
  const additionalFeeAmount = bookingRules.additionalFeeZar;
  const discountAmount = bookingRules.discountZar;
  const totalAmount =
    Math.round((subtotalAmount + additionalFeeAmount - discountAmount) * 100) / 100;
  const depositAmount = Math.round(totalAmount * bookingRules.depositRate * 100) / 100;
  const balanceAmount = Math.round((totalAmount - depositAmount) * 100) / 100;
  return { subtotalAmount, additionalFeeAmount, discountAmount, totalAmount, depositAmount, balanceAmount };
}

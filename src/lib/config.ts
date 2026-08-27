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
  /** IANA time zone the property operates in — all "today"/lead-time/hold-expiry
   * calculations are anchored to this, not the server's or guest's local time. */
  timeZone: 'Africa/Johannesburg',
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
  /** Maximum nights a single request may span — configurable guardrail. */
  maxNights: 21,
  /** Fraction of the total accommodation price due as a deposit once accepted. */
  depositRate: 0.5,
  /** Hours an accepted-but-unpaid booking holds its dates before expiring. */
  holdExpiryHours: 24,
  /** How far in the future guests may book. */
  maxAdvanceBookingDays: 365,
  /**
   * Minimum notice required before check-in, in hours — guests cannot
   * request a check-in date closer than this. Set `sameDayBookingEnabled`
   * to bypass it entirely (e.g. for a property that accepts walk-in-style
   * same-day requests).
   */
  leadTimeHours: 24,
  sameDayBookingEnabled: false,
  /** Currency for all monetary values. */
  currency: 'ZAR' as const,
} as const;

export const pricingConfig = {
  /** Standard nightly rate (ZAR), used when no weekend/seasonal rate applies. */
  standardNightlyRateZar: 1850,
  /**
   * Optional override rate for Friday and Saturday nights. Set to null to
   * charge the standard rate on weekends too.
   */
  weekendNightlyRateZar: 2100 as number | null,
  /**
   * Optional date-range rate overrides, checked in array order — the first
   * matching range wins, and a seasonal rate takes precedence over the
   * weekend rate for any night it covers. Dates are inclusive, ISO
   * (YYYY-MM-DD), interpreted in `siteConfig.timeZone`.
   */
  seasonalRates: [] as { id: string; label: string; startDate: string; endDate: string; nightlyRateZar: number }[],
  /** Flat cleaning fee added once per booking. 0 = none. */
  cleaningFeeZar: 450,
  /** Flat service/booking fee added once per booking. 0 = none. */
  serviceFeeZar: 0,
  /** Flat discount subtracted from the accommodation price. 0 = none. */
  discountZar: 0,
  discountLabel: 'Discount',
  /**
   * Refundable security/breakage deposit — displayed and recorded on the
   * booking, but NOT part of the 50/50 deposit/balance split and not
   * collected through the online payment flow in this build (typically
   * taken as cash/card on arrival and refunded after checkout). 0 = none.
   */
  securityDepositZar: 0,
} as const;

export const paymentConfig = {
  provider: (process.env.PAYMENT_PROVIDER ?? 'dev') as
    | 'payfast'
    | 'peach'
    | 'yoco'
    | 'dev',
} as const;

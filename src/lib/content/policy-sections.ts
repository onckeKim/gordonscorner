/**
 * The comprehensive Policies page (booking / cancellation / house rules /
 * damages & security / privacy) — every section is admin-editable content
 * (see src/lib/content/sections.ts + content_sections table), these are
 * only the static defaults a fresh database starts with.
 *
 * IMPORTANT — LEGAL DISCLAIMER: this wording is placeholder/starting-point
 * copy, not vetted legal text. Before relying on any of it, the property
 * owner must review and, where the cancellation/damages/privacy terms have
 * real financial or legal consequences, have it checked by a South African
 * legal professional (POPIA compliance in particular for the Privacy
 * section). See the on-page disclaimer in /policies itself.
 */

export const POLICY_VERSION = '2026-08-28';

export interface PolicyItem {
  id: string;
  title: string;
  content: string;
}

export interface CancellationTier {
  id: string;
  label: string;
  /** A cancellation qualifies for this tier if it happens at least this many days before check-in. Tiers are checked in array order — put the most generous (highest day count) first. */
  minDaysBeforeCheckIn: number;
  /** Percentage of the deposit refunded for this tier — configurable, never hardcoded into prose. */
  refundPercent: number;
}

export interface BookingPolicySection {
  intro: string;
  items: string[];
}

export const bookingPolicyDefaults: BookingPolicySection = {
  intro:
    'These terms apply to every booking request made through Gordon’s Corner. By submitting a request, you agree to the following:',
  items: [
    'Minimum stay is 2 nights (or the currently configured minimum — see the booking form).',
    'A booking request is not automatically confirmed — every request is reviewed individually.',
    'Availability remains subject to administrator approval, even for dates the calendar shows as open at the time of your request.',
    'Once accepted, a 50% deposit (or the currently configured deposit percentage) of the total accommodation price is required to secure your dates.',
    'A booking is only confirmed once the required deposit has actually cleared — not when payment is initiated.',
    'Secure payment links expire after the configured deadline; an expired link cannot be used to complete payment.',
    'Temporarily held dates may be released, without further notice, if payment is not received before the hold expires.',
    'The remaining balance must be paid in full by the configured due date shown on your booking confirmation.',
  ],
};

export interface CancellationPolicySection {
  tiers: CancellationTier[];
  guestCancellationProcedure: string;
  refundEligibility: string;
  adminAndProviderCharges: string;
  lateCancellation: string;
  noShowProcedure: string;
  earlyDeparture: string;
  cancellationByProperty: string;
  exceptionalCircumstances: string;
  refundProcessingTime: string;
}

export const cancellationPolicyDefaults: CancellationPolicySection = {
  tiers: [
    { id: 'flexible', label: '14 or more days before check-in', minDaysBeforeCheckIn: 14, refundPercent: 100 },
    { id: 'moderate', label: '7–13 days before check-in', minDaysBeforeCheckIn: 7, refundPercent: 50 },
    { id: 'strict', label: 'Less than 7 days before check-in', minDaysBeforeCheckIn: 0, refundPercent: 0 },
  ],
  guestCancellationProcedure:
    'To cancel, contact us in writing (email or via your booking status page) as early as possible. Your cancellation takes effect from the date we receive it, not the date you decide to cancel.',
  refundEligibility:
    'Refund eligibility is determined by how many full days remain between the date we receive your cancellation and your check-in date, using the tiers above. Only the deposit is eligible for a refund under these tiers — amounts already applied toward the balance are handled case by case.',
  adminAndProviderCharges:
    'Any transaction or administrative fee charged by our payment provider on the original payment is not refundable and will be deducted from the refunded amount where applicable.',
  lateCancellation:
    'Cancellations made less than 7 days (or the currently configured strict-tier window) before check-in are not eligible for a deposit refund, except where the exceptional-circumstances policy below applies.',
  noShowProcedure:
    'If a guest does not arrive by the end of the check-in day and has not contacted us, the booking is treated as a no-show: the stay is forfeited, no further refund is due, and the dates may be released.',
  earlyDeparture:
    'Departing earlier than your confirmed check-out date does not entitle you to a refund for unused nights, except where agreed with us in advance in writing.',
  cancellationByProperty:
    'In the rare case we need to cancel a confirmed booking (e.g. a safety issue or a double-booking error), we will notify you as soon as possible, refund 100% of any amount paid, and reasonably assist with finding alternative accommodation.',
  exceptionalCircumstances:
    'We may, at our sole discretion, make exceptions to the tiers above for documented emergencies (e.g. serious illness, bereavement, or other circumstances beyond your control). Exceptions are considered case by case and are not guaranteed.',
  refundProcessingTime:
    'Approved refunds are returned to your original payment method and typically reflect within 5–7 business days, depending on your bank or card provider.',
};

export const houseRulesDefaults: PolicyItem[] = [
  { id: 'check-in-out', title: 'Check-in and check-out', content: 'Check-in is from the time shown on your confirmation; check-out is by the time shown. Early or late arrangements can sometimes be accommodated — please ask in advance.' },
  { id: 'max-occupancy', title: 'Maximum occupancy', content: 'The number of guests staying may never exceed the property’s configured maximum guest capacity, including infants and visitors staying overnight.' },
  { id: 'registered-guests', title: 'Registered guests only', content: 'Only guests included in the confirmed booking may stay overnight. Please let us know in advance if your guest count changes.' },
  { id: 'visitors', title: 'Visitors', content: 'Daytime visitors are welcome with prior notice. Overnight guests beyond those on the booking must be arranged with us in advance and may affect the total price.' },
  { id: 'parties-events', title: 'Parties and events', content: 'Parties and events are not permitted on the property.' },
  { id: 'noise', title: 'Noise and quiet hours', content: 'Quiet hours run from 22:00 to 07:00, out of consideration for neighbours. Please keep noise to a reasonable level throughout your stay.' },
  { id: 'smoking', title: 'Smoking', content: 'No smoking indoors. Outdoor smoking is permitted only in designated areas, away from open windows and doors.' },
  { id: 'pets', title: 'Pets', content: 'Well-behaved pets are welcome by prior arrangement only — please mention this in your booking request before arrival.' },
  { id: 'children', title: 'Children', content: 'Children of all ages are welcome and must be included in your guest count. Please supervise children around any pool, water feature, or braai area.' },
  { id: 'parking', title: 'Parking', content: 'Use only the parking bay(s) allocated to your booking. Do not block neighbouring properties or shared access routes.' },
  { id: 'keys-access', title: 'Keys and access devices', content: 'Keys, access codes, or access devices issued to you are your responsibility for the duration of your stay. Report a lost key or device to us immediately — replacement costs may apply.' },
  { id: 'furniture-care', title: 'Furniture and property care', content: 'Please treat the property and its furnishings with care, and return furniture to its original position before check-out.' },
  { id: 'illegal-activity', title: 'Illegal activity', content: 'Any illegal activity on the property will result in immediate termination of the stay without refund, and may be reported to the relevant authorities.' },
  { id: 'commercial-photography', title: 'Commercial photography', content: 'Commercial photography, filming, or content creation on the property requires prior written permission from us.' },
  { id: 'cleaning-expectations', title: 'Cleaning expectations', content: 'A professional clean is included before and after your stay. We ask that you leave the property in a reasonably tidy state — dishes washed, rubbish bagged — to avoid an excessive-cleaning charge.' },
];

export const damagesSecurityDefaults: PolicyItem[] = [
  { id: 'guest-responsibility', title: 'Guest responsibility for damages', content: 'Guests are responsible for the cost of any damage to the property or its contents beyond reasonable wear and tear, caused during their stay.' },
  { id: 'missing-items', title: 'Missing items', content: 'Any items found missing after check-out will be charged at replacement cost, deducted from a security deposit where one was collected, or invoiced separately.' },
  { id: 'excessive-cleaning', title: 'Excessive cleaning', content: 'A property left in a condition requiring cleaning significantly beyond our standard turnover clean may incur an additional cleaning charge.' },
  { id: 'security-deposit', title: 'Security or breakage deposit', content: 'Where a refundable security/breakage deposit is configured for your booking, it is collected separately from the accommodation deposit and refunded after check-out, less any deductions for damage, missing items, or excessive cleaning.' },
  { id: 'damage-reporting', title: 'Damage-reporting process', content: 'Please report any damage — caused by you or found on arrival — as soon as possible by contacting us directly, so it can be addressed fairly and promptly.' },
  { id: 'recovery-of-costs', title: 'Right to recover costs', content: 'We reserve the right to recover reasonable repair or replacement costs from the guest, including via the security deposit, the original payment method, or a separate invoice, for damage caused during a stay.' },
];

export const privacyDefaults: PolicyItem[] = [
  { id: 'contact-details', title: 'Guest contact details', content: 'We collect your name, email address, phone number, and country to process and communicate about your booking. This information is used only for that purpose and for related guest support.' },
  { id: 'booking-information', title: 'Booking information', content: 'Details of your stay (dates, guest count, requests, and communication with us) are retained as part of your booking record for operational and accounting purposes.' },
  { id: 'payment-references', title: 'Payment references', content: 'We store payment status, amounts, currency, dates, and provider references for each transaction. We never store complete card details — these are handled entirely by our payment provider.' },
  { id: 'email-communication', title: 'Email communication', content: 'We send booking-related emails (confirmations, reminders, receipts) as part of fulfilling your booking. Where you’ve given consent for other communication, you may withdraw it at any time by contacting us.' },
  { id: 'cookies', title: 'Cookies', content: 'The website uses only the cookies strictly necessary for it to function (e.g. keeping you signed in to the admin portal, or your booking session). We do not use third-party advertising cookies.' },
  { id: 'analytics', title: 'Analytics', content: 'If website analytics are enabled, they are used only in aggregate to understand site usage and are not used to identify individual guests.' },
  { id: 'data-retention', title: 'Data retention', content: 'Booking and payment records are retained for as long as required for accounting, tax, and legal purposes, after which they are securely deleted or anonymised.' },
  { id: 'data-access-correction', title: 'Data-access and correction requests', content: 'You may request a copy of the personal information we hold about you, or ask us to correct inaccurate information, via our privacy request form at /privacy-request or by contacting us directly.' },
  { id: 'data-deletion', title: 'Data-deletion requests', content: 'You may request deletion of your personal information via our privacy request form at /privacy-request, subject to our legal obligation to retain certain booking and financial records for the statutory period.' },
  { id: 'third-party-providers', title: 'Third-party service providers', content: 'We share only the information necessary to operate the booking with our service providers: Supabase (database/hosting), Resend (email delivery), and our payment provider (payment processing). Each processes data under their own privacy and security terms.' },
];

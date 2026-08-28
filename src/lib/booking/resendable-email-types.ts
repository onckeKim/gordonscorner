/**
 * Shared between the server-only workflow module and client-side admin UI
 * (the resend picker) — kept in its own file, with no 'server-only' import,
 * so a 'use client' component can safely import the const array/type.
 */
export const RESENDABLE_EMAIL_TYPES = [
  'booking_received',
  'booking_accepted',
  'booking_declined',
  'booking_cancelled',
  'booking_confirmed',
  'pre_arrival',
  'check_in_instructions',
  'check_out_reminder',
  'post_stay_thank_you',
  'review_request',
] as const;

export type ResendableEmailType = (typeof RESENDABLE_EMAIL_TYPES)[number];

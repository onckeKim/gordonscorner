import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { bookingRules, propertyDetails } from '@/lib/config';
import { calculateStayPricing } from '@/lib/pricing';
import { checkAvailability } from '@/lib/booking/availability';
import { generateBookingReference, generatePaymentToken } from '@/lib/booking/reference';
import { createPaymentLink } from '@/lib/payments';
import {
  sendBookingReceivedEmail,
  sendAdminNewRequestEmail,
  sendDepositLinkEmail,
  sendDeclinedEmail,
  sendInfoRequestedEmail,
  sendDatesProposedEmail,
  sendBookingConfirmedEmail,
  sendAdminConfirmedEmail,
} from '@/lib/email';
import type { Booking, BookingStatus, StatusActor } from '@/types/database';

export class WorkflowError extends Error {}

/** Raised when the database's overlap constraint rejects a write — a race
 * was actually caught (two accepts landing on the same dates at once). */
export class DoubleBookingError extends WorkflowError {}

const EXCLUSION_VIOLATION = '23P01';

type Db = ReturnType<typeof createAdminSupabaseClient>;

async function recordHistory(
  db: Db,
  bookingId: string,
  fromStatus: BookingStatus | null,
  toStatus: BookingStatus,
  actor: StatusActor,
  note?: string,
) {
  await db.from('booking_status_history').insert({
    booking_id: bookingId,
    from_status: fromStatus,
    to_status: toStatus,
    actor,
    note: note ?? null,
  });
}

async function getBookingOrThrow(db: Db, bookingId: string): Promise<Booking> {
  const { data, error } = await db.from('bookings').select('*').eq('id', bookingId).single();
  if (error || !data) {
    throw new WorkflowError('Booking not found.');
  }
  return data;
}

function assertStatus(booking: Booking, allowed: BookingStatus[]) {
  if (!allowed.includes(booking.status)) {
    throw new WorkflowError(
      `Booking is in status "${booking.status}" and cannot perform this action.`,
    );
  }
}

/**
 * Creates a new booking request. Re-validates availability server-side
 * (never trust the client's read of the calendar) and always computes
 * pricing itself from the central pricing engine — the client never sends
 * amounts at all, so there is nothing to tamper with.
 */
export async function createBookingRequest(input: {
  firstName: string;
  lastName: string;
  guestEmail: string;
  guestPhone: string;
  guestCountry: string;
  checkIn: string;
  checkOut: string;
  adultsCount: number;
  childrenCount: number;
  estimatedArrivalTime?: string;
  message?: string;
  bookingPurpose?: string;
  termsAgreed: boolean;
  cancellationPolicyAgreed: boolean;
  communicationConsent: boolean;
}): Promise<Booking> {
  if (!input.termsAgreed) {
    throw new WorkflowError('Please confirm you accept the booking terms.');
  }
  if (!input.cancellationPolicyAgreed) {
    throw new WorkflowError('Please confirm you accept the cancellation policy.');
  }

  const guestsCount = input.adultsCount + input.childrenCount;
  if (guestsCount < 1) {
    throw new WorkflowError('Please add at least one guest.');
  }
  if (guestsCount > propertyDetails.maxGuests) {
    throw new WorkflowError(`This property sleeps a maximum of ${propertyDetails.maxGuests} guests.`);
  }

  const availability = await checkAvailability({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
  });

  if (!availability.available) {
    throw new WorkflowError(availability.reason ?? 'These dates are not available.');
  }

  const pricing = calculateStayPricing(input.checkIn, input.checkOut);
  const now = new Date().toISOString();

  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from('bookings')
    .insert({
      guest_name: `${input.firstName} ${input.lastName}`.trim(),
      guest_first_name: input.firstName,
      guest_last_name: input.lastName,
      guest_email: input.guestEmail,
      guest_phone: input.guestPhone,
      guest_country: input.guestCountry,
      check_in: input.checkIn,
      check_out: input.checkOut,
      guests_count: guestsCount,
      adults_count: input.adultsCount,
      children_count: input.childrenCount,
      estimated_arrival_time: input.estimatedArrivalTime ?? null,
      message: input.message ?? null,
      booking_purpose: input.bookingPurpose ?? null,
      status: 'submitted',
      accommodation_subtotal: pricing.accommodationSubtotal,
      cleaning_fee_amount: pricing.cleaningFeeAmount,
      service_fee_amount: pricing.serviceFeeAmount,
      discount_amount: pricing.discountAmount,
      security_deposit_amount: pricing.securityDepositAmount,
      nightly_rate_breakdown: pricing.nightlyBreakdown,
      total_amount: pricing.totalAccommodationPrice,
      deposit_amount: pricing.depositAmount,
      balance_amount: pricing.balanceAmount,
      currency: pricing.currency,
      terms_agreed_at: now,
      cancellation_policy_agreed_at: now,
      communication_consent_at: input.communicationConsent ? now : null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new WorkflowError(`Could not create booking: ${error?.message}`);
  }

  await recordHistory(db, data.id, null, 'submitted', 'guest');

  await Promise.all([sendBookingReceivedEmail(data), sendAdminNewRequestEmail(data)]);

  return data;
}

/**
 * Marks a freshly submitted request as under review the first time an
 * admin opens it — called from the admin booking-detail page. A no-op for
 * any other status.
 */
export async function markUnderReviewIfNeeded(bookingId: string, adminId: string): Promise<void> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  if (booking.status !== 'submitted') return;

  const { error } = await db.from('bookings').update({ status: 'under_review' }).eq('id', bookingId);
  if (!error) {
    await recordHistory(db, bookingId, 'submitted', 'under_review', 'admin', undefined);
  }
}

/**
 * Admin accepts a request: holds the dates (soft, until hold_expires_at),
 * generates a payment token + secure deposit link, and emails the guest.
 * The database's overlap constraint (migration 0005) is the real guard
 * here — this can legitimately fail with DoubleBookingError if another
 * request for the same dates was accepted first.
 */
export async function acceptBooking(bookingId: string, adminId: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['submitted', 'under_review', 'information_required', 'alternative_dates_proposed']);

  const availability = await checkAvailability({
    checkIn: booking.check_in,
    checkOut: booking.check_out,
  });
  if (!availability.available) {
    throw new WorkflowError(
      `Cannot accept: ${availability.reason ?? 'dates are no longer available.'}`,
    );
  }

  const paymentToken = generatePaymentToken();
  const holdExpiresAt = new Date(
    Date.now() + bookingRules.holdExpiryHours * 60 * 60 * 1000,
  ).toISOString();

  const { data: updated, error } = await db
    .from('bookings')
    .update({
      status: 'accepted_awaiting_deposit',
      hold_expires_at: holdExpiresAt,
      payment_token: paymentToken,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error) {
    if (error.code === EXCLUSION_VIOLATION) {
      throw new DoubleBookingError(
        'These dates were just accepted on another booking request. Please decline or propose different dates for this one.',
      );
    }
    throw new WorkflowError(`Could not accept booking: ${error.message}`);
  }
  if (!updated) {
    throw new WorkflowError('Could not accept booking.');
  }

  await recordHistory(db, bookingId, booking.status, 'accepted_awaiting_deposit', 'admin', undefined);

  const paymentLink = await createPaymentLink(updated, 'deposit');
  await sendDepositLinkEmail(updated, paymentLink.url);

  return updated;
}

export async function declineBooking(
  bookingId: string,
  adminId: string,
  reason?: string,
): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, [
    'submitted',
    'under_review',
    'information_required',
    'alternative_dates_proposed',
    'accepted_awaiting_deposit',
    'deposit_processing',
  ]);

  const { data: updated, error } = await db
    .from('bookings')
    .update({ status: 'declined', decline_reason: reason ?? null, hold_expires_at: null })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not decline booking: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'declined', 'admin', reason);
  await sendDeclinedEmail(updated);

  return updated;
}

export async function requestInfo(
  bookingId: string,
  adminId: string,
  message: string,
): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['submitted', 'under_review']);

  const { data: updated, error } = await db
    .from('bookings')
    .update({ status: 'information_required', info_request_message: message })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not request info: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'information_required', 'admin', message);
  await sendInfoRequestedEmail(updated, message);

  return updated;
}

export async function proposeAlternativeDates(
  bookingId: string,
  adminId: string,
  proposedCheckIn: string,
  proposedCheckOut: string,
): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['submitted', 'under_review', 'information_required']);

  const availability = await checkAvailability({
    checkIn: proposedCheckIn,
    checkOut: proposedCheckOut,
  });
  if (!availability.available) {
    throw new WorkflowError(
      `Cannot propose these dates: ${availability.reason ?? 'not available.'}`,
    );
  }

  const { data: updated, error } = await db
    .from('bookings')
    .update({
      status: 'alternative_dates_proposed',
      proposed_check_in: proposedCheckIn,
      proposed_check_out: proposedCheckOut,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not propose dates: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'alternative_dates_proposed', 'admin');
  await sendDatesProposedEmail(updated);

  return updated;
}

/**
 * Guest accepts the admin's proposed alternative dates: the booking's
 * dates are updated (re-pricing, since nights/rates may differ) and it
 * returns to under_review for a final admin acceptance.
 */
export async function guestAcceptsProposedDates(bookingId: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['alternative_dates_proposed']);

  if (!booking.proposed_check_in || !booking.proposed_check_out) {
    throw new WorkflowError('No proposed dates on this booking.');
  }

  const pricing = calculateStayPricing(booking.proposed_check_in, booking.proposed_check_out);

  const { data: updated, error } = await db
    .from('bookings')
    .update({
      status: 'under_review',
      check_in: booking.proposed_check_in,
      check_out: booking.proposed_check_out,
      proposed_check_in: null,
      proposed_check_out: null,
      accommodation_subtotal: pricing.accommodationSubtotal,
      cleaning_fee_amount: pricing.cleaningFeeAmount,
      service_fee_amount: pricing.serviceFeeAmount,
      discount_amount: pricing.discountAmount,
      security_deposit_amount: pricing.securityDepositAmount,
      nightly_rate_breakdown: pricing.nightlyBreakdown,
      total_amount: pricing.totalAccommodationPrice,
      deposit_amount: pricing.depositAmount,
      balance_amount: pricing.balanceAmount,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not update booking: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'under_review', 'guest');
  return updated;
}

export async function guestDeclinesProposedDates(bookingId: string): Promise<Booking> {
  return declineBooking(bookingId, 'guest-declined-proposal', 'Guest declined proposed dates.');
}

/**
 * Called right before the guest is handed off to the payment provider
 * (see /pay/[token]). Purely informational — lets admins see "the guest is
 * mid-checkout" rather than just "awaiting deposit". Never blocks: if the
 * booking isn't in a state this applies to, it's simply a no-op.
 */
export async function markDepositProcessing(bookingId: string): Promise<void> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  if (booking.status !== 'accepted_awaiting_deposit') return;

  const { error } = await db
    .from('bookings')
    .update({ status: 'deposit_processing' })
    .eq('id', bookingId);
  if (!error) {
    await recordHistory(db, bookingId, 'accepted_awaiting_deposit', 'deposit_processing', 'guest');
  }
}

/**
 * Called by the payment webhook once the deposit succeeds. Marks the
 * booking confirmed, generates the booking reference, hard-blocks the
 * dates (via status change alone — the availability view already treats
 * 'confirmed' as blocking), and fires all confirmation notifications.
 */
export async function markDepositPaid(bookingId: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);

  if (booking.status === 'confirmed' || booking.status === 'checked_in' || booking.status === 'checked_out') {
    return booking; // idempotent: webhook may fire more than once
  }

  assertStatus(booking, ['accepted_awaiting_deposit', 'deposit_processing']);

  let reference = booking.reference;
  if (!reference) {
    reference = generateBookingReference();
  }

  const { data: updated, error } = await db
    .from('bookings')
    .update({
      status: 'confirmed',
      reference,
      deposit_paid_at: new Date().toISOString(),
      hold_expires_at: null,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not confirm booking: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'confirmed', 'system', 'Deposit paid');

  await Promise.all([sendBookingConfirmedEmail(updated), sendAdminConfirmedEmail(updated)]);

  return updated;
}

/**
 * Called by the payment webhook when a deposit payment fails or is
 * cancelled by the guest — returns the booking to accepted_awaiting_deposit
 * (still holding the dates, if the hold hasn't lapsed) so they can retry
 * from the same payment link.
 */
export async function markDepositFailed(bookingId: string): Promise<void> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  if (booking.status !== 'deposit_processing') return;

  const { error } = await db
    .from('bookings')
    .update({ status: 'accepted_awaiting_deposit' })
    .eq('id', bookingId);
  if (!error) {
    await recordHistory(db, bookingId, 'deposit_processing', 'accepted_awaiting_deposit', 'system', 'Payment failed or cancelled');
  }
}

/** Admin manually records the remaining balance as paid (e.g. cash/EFT on arrival). Does not change status. */
export async function markBalancePaid(bookingId: string, adminId: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['confirmed', 'checked_in', 'checked_out']);

  const { data: updated, error } = await db
    .from('bookings')
    .update({
      balance_paid_at: new Date().toISOString(),
      balance_marked_paid_by: adminId,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not record balance payment: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, booking.status, 'admin', 'Balance paid');
  return updated;
}

/** Called by the payment webhook when a guest pays the balance online (self-serve). Does not change status. */
export async function markBalancePaidViaPayment(bookingId: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);

  if (booking.balance_paid_at) {
    return booking; // idempotent
  }
  assertStatus(booking, ['confirmed', 'checked_in', 'checked_out']);

  const { data: updated, error } = await db
    .from('bookings')
    .update({ balance_paid_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not record balance payment: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, booking.status, 'system', 'Balance paid online');
  return updated;
}

export async function cancelBooking(
  bookingId: string,
  adminId: string,
  reason?: string,
): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['accepted_awaiting_deposit', 'deposit_processing', 'confirmed']);

  const { data: updated, error } = await db
    .from('bookings')
    .update({ status: 'cancelled', decline_reason: reason ?? null, hold_expires_at: null })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not cancel booking: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'cancelled', 'admin', reason);
  return updated;
}

/** Admin marks a confirmed guest as arrived. */
export async function checkInBooking(bookingId: string, adminId: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['confirmed']);

  const { data: updated, error } = await db
    .from('bookings')
    .update({ status: 'checked_in' })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not check in booking: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'checked_in', 'admin');
  return updated;
}

/** Admin marks a checked-in guest as departed. */
export async function checkOutBooking(bookingId: string, adminId: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['checked_in']);

  const { data: updated, error } = await db
    .from('bookings')
    .update({ status: 'checked_out' })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not check out booking: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'checked_out', 'admin');
  return updated;
}

/** Admin marks a confirmed guest as never having arrived. */
export async function markNoShow(bookingId: string, adminId: string, reason?: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['confirmed']);

  const { data: updated, error } = await db
    .from('bookings')
    .update({ status: 'no_show', decline_reason: reason ?? null })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not mark booking as no-show: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'no_show', 'admin', reason);
  return updated;
}

/**
 * Releases dates from bookings whose accept-hold has expired without
 * payment. Intended to run on a schedule (see /api/cron/expire-holds).
 */
export async function expireStaleHolds(): Promise<number> {
  const db = createAdminSupabaseClient();
  const { data: expired, error } = await db
    .from('bookings')
    .select('*')
    .in('status', ['accepted_awaiting_deposit', 'deposit_processing'])
    .lt('hold_expires_at', new Date().toISOString());

  if (error) {
    throw new WorkflowError(`Could not query expired holds: ${error.message}`);
  }

  for (const booking of expired ?? []) {
    await db
      .from('bookings')
      .update({ status: 'expired', hold_expires_at: null })
      .eq('id', booking.id);
    await recordHistory(db, booking.id, booking.status, 'expired', 'system', 'Hold expired unpaid.');
  }

  return expired?.length ?? 0;
}

import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { calculateStayPricing } from '@/lib/pricing';
import { getSettings, getEffectivePricingInputs } from '@/lib/settings';
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
  sendReceiptEmail,
  sendRefundEmail,
  sendPaymentLinkResentEmail,
} from '@/lib/email';
import { writeAuditLog } from '@/lib/audit';
import type { Booking, BookingStatus, GuestCommunication, GuestCommunicationChannel, Payment, StatusActor } from '@/types/database';

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

  const settings = await getSettings();

  const guestsCount = input.adultsCount + input.childrenCount;
  if (guestsCount < 1) {
    throw new WorkflowError('Please add at least one guest.');
  }
  if (guestsCount > settings.guest_capacity) {
    throw new WorkflowError(`This property sleeps a maximum of ${settings.guest_capacity} guests.`);
  }

  const availability = await checkAvailability({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
  });

  if (!availability.available) {
    throw new WorkflowError(availability.reason ?? 'These dates are not available.');
  }

  const pricingInputs = await getEffectivePricingInputs();
  const pricing = calculateStayPricing(input.checkIn, input.checkOut, pricingInputs);
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
      tax_amount: pricing.taxAmount,
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

  const settings = await getSettings();
  const paymentToken = generatePaymentToken();
  const holdExpiresAt = new Date(
    Date.now() + settings.hold_period_hours * 60 * 60 * 1000,
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

  const pricingInputs = await getEffectivePricingInputs();
  const pricing = calculateStayPricing(booking.proposed_check_in, booking.proposed_check_out, pricingInputs);

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
      tax_amount: pricing.taxAmount,
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

/**
 * Admin records a payment made outside the online flow — EFT, cash, card
 * on arrival, etc. Always creates a `payments` row (provider: 'manual') so
 * every payment, online or not, has the same audit trail: reference,
 * amount, currency, date, status, type. This is what "Mark balance as
 * paid" and "Record an EFT or manual payment" both reduce to.
 */
export async function recordManualPayment(
  bookingId: string,
  adminId: string,
  input: {
    type: 'deposit' | 'balance';
    amount: number;
    reference?: string;
    note?: string;
    proofOfPaymentUrl?: string;
    paidAt?: string;
  },
): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);

  if (input.type === 'deposit') {
    assertStatus(booking, ['accepted_awaiting_deposit', 'deposit_processing']);
  } else {
    assertStatus(booking, ['confirmed', 'checked_in', 'checked_out']);
    if (booking.balance_paid_at) {
      throw new WorkflowError('The balance for this booking is already recorded as paid.');
    }
  }

  const paidAt = input.paidAt ?? new Date().toISOString();

  const { data: payment, error } = await db
    .from('payments')
    .insert({
      booking_id: bookingId,
      type: input.type,
      provider: 'manual',
      provider_reference: input.reference ?? null,
      amount: input.amount,
      status: 'paid',
      paid_at: paidAt,
      admin_note: input.note ?? null,
      recorded_by: adminId,
      proof_of_payment_url: input.proofOfPaymentUrl ?? null,
    })
    .select('*')
    .single();

  if (error || !payment) {
    throw new WorkflowError(`Could not record payment: ${error?.message}`);
  }

  await db.from('payment_events').insert({
    booking_id: bookingId,
    payment_id: payment.id,
    event_type: 'manual_payment_recorded',
    provider: 'manual',
    actor: 'admin',
    actor_id: adminId,
    note: input.note ?? null,
  });

  let updatedBooking: Booking;
  if (input.type === 'deposit') {
    updatedBooking = await markDepositPaid(bookingId);
  } else {
    const { data: updated, error: balanceError } = await db
      .from('bookings')
      .update({ balance_paid_at: paidAt, balance_marked_paid_by: adminId })
      .eq('id', bookingId)
      .select('*')
      .single();
    if (balanceError || !updated) {
      throw new WorkflowError(`Could not record balance payment: ${balanceError?.message}`);
    }
    await recordHistory(db, bookingId, booking.status, booking.status, 'admin', 'Balance paid (manual)');
    updatedBooking = updated;
  }

  await sendReceiptEmail(updatedBooking, payment);
  return updatedBooking;
}

/** Convenience one-click version of recordManualPayment for the common case: full balance, no reference/proof needed. */
export async function markBalancePaid(bookingId: string, adminId: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  return recordManualPayment(bookingId, adminId, { type: 'balance', amount: booking.balance_amount });
}

/**
 * Admin issues/records a refund (full or partial) against a previously paid
 * deposit or balance payment. This system doesn't call the payment
 * provider's refund API directly (that requires broader API credentials
 * most merchants don't grant by default) — the admin processes the refund
 * with the provider directly and records it here, so the booking's
 * financial record stays accurate and auditable either way.
 */
export async function issueRefund(
  bookingId: string,
  adminId: string,
  input: { amount: number; sourcePaymentId?: string; reason?: string },
): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);

  if (input.amount <= 0) {
    throw new WorkflowError('Refund amount must be greater than zero.');
  }

  const { data: refundPayment, error } = await db
    .from('payments')
    .insert({
      booking_id: bookingId,
      type: 'refund',
      provider: 'manual',
      amount: input.amount,
      status: 'paid',
      paid_at: new Date().toISOString(),
      admin_note: input.reason ?? null,
      recorded_by: adminId,
    })
    .select('*')
    .single();

  if (error || !refundPayment) {
    throw new WorkflowError(`Could not record refund: ${error?.message}`);
  }

  if (input.sourcePaymentId) {
    const { data: source } = await db
      .from('payments')
      .select('*')
      .eq('id', input.sourcePaymentId)
      .single();

    if (source) {
      const newRefundedAmount = Math.round((source.refunded_amount + input.amount) * 100) / 100;
      const newStatus = newRefundedAmount >= source.amount ? 'refunded' : 'partially_refunded';
      await db
        .from('payments')
        .update({ refunded_amount: newRefundedAmount, status: newStatus })
        .eq('id', source.id);
    }
  }

  await db.from('payment_events').insert({
    booking_id: bookingId,
    payment_id: refundPayment.id,
    event_type: 'refund_recorded',
    provider: 'manual',
    actor: 'admin',
    actor_id: adminId,
    note: input.reason ?? null,
  });

  await recordHistory(
    db,
    bookingId,
    booking.status,
    booking.status,
    'admin',
    `Refund recorded: ${input.amount} ${booking.currency}${input.reason ? ` — ${input.reason}` : ''}`,
  );

  await sendRefundEmail(booking, refundPayment);
  return booking;
}

/** Admin adds/edits an internal note on a payment record — never guest-facing. */
export async function addPaymentNote(paymentId: string, adminId: string, note: string): Promise<Payment> {
  const db = createAdminSupabaseClient();
  const { data: payment, error } = await db
    .from('payments')
    .update({ admin_note: note })
    .eq('id', paymentId)
    .select('*')
    .single();

  if (error || !payment) {
    throw new WorkflowError(`Could not save note: ${error?.message}`);
  }

  await db.from('payment_events').insert({
    booking_id: payment.booking_id,
    payment_id: paymentId,
    event_type: 'note_added',
    actor: 'admin',
    actor_id: adminId,
    note,
  });

  return payment;
}

/** Admin resends the deposit or balance payment link (same token, same amount). */
export async function resendPaymentLink(
  bookingId: string,
  adminId: string,
  type: 'deposit' | 'balance',
): Promise<void> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);

  if (type === 'deposit') {
    assertStatus(booking, ['accepted_awaiting_deposit', 'deposit_processing']);
  } else {
    assertStatus(booking, ['confirmed', 'checked_in', 'checked_out']);
    if (booking.balance_paid_at) {
      throw new WorkflowError('The balance for this booking is already paid.');
    }
  }

  const { url } = await createPaymentLink(booking, type);
  await sendPaymentLinkResentEmail(booking, url, type);

  await db.from('payment_events').insert({
    booking_id: bookingId,
    event_type: 'link_resent',
    actor: 'admin',
    actor_id: adminId,
    note: `${type} link resent`,
  });
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

export interface ManualBookingInput {
  firstName: string;
  lastName: string;
  guestEmail: string;
  guestPhone?: string;
  guestCountry?: string;
  checkIn: string;
  checkOut: string;
  adultsCount: number;
  childrenCount: number;
  message?: string;
  /**
   * 'confirmed' — dates hard-blocked immediately, no deposit link sent
   * (use "record manual payment" afterwards for any payment received
   * outside the online flow). 'accepted_awaiting_deposit' — dates held and
   * a normal deposit link is emailed, exactly like a guest-submitted
   * request an admin just accepted.
   */
  initialStatus: 'confirmed' | 'accepted_awaiting_deposit';
}

/**
 * Admin creates a booking directly (phone/email enquiry, walk-in, etc.)
 * instead of the guest submitting the public form. Goes through the same
 * pricing engine, availability check, and double-booking constraint as
 * every other booking — an admin-created booking can never silently
 * overlap an existing one either.
 */
export async function createManualBooking(actor: { id: string; email: string }, input: ManualBookingInput): Promise<Booking> {
  const settings = await getSettings();
  const guestsCount = input.adultsCount + input.childrenCount;
  if (guestsCount < 1) {
    throw new WorkflowError('Please add at least one guest.');
  }
  if (guestsCount > settings.guest_capacity) {
    throw new WorkflowError(`This property sleeps a maximum of ${settings.guest_capacity} guests.`);
  }

  const availability = await checkAvailability({ checkIn: input.checkIn, checkOut: input.checkOut });
  if (!availability.available) {
    throw new WorkflowError(availability.reason ?? 'These dates are not available.');
  }

  const pricingInputs = await getEffectivePricingInputs();
  const pricing = calculateStayPricing(input.checkIn, input.checkOut, pricingInputs);
  const now = new Date().toISOString();
  const db = createAdminSupabaseClient();

  const basePatch = {
    guest_name: `${input.firstName} ${input.lastName}`.trim(),
    guest_first_name: input.firstName,
    guest_last_name: input.lastName,
    guest_email: input.guestEmail,
    guest_phone: input.guestPhone ?? null,
    guest_country: input.guestCountry ?? null,
    check_in: input.checkIn,
    check_out: input.checkOut,
    guests_count: guestsCount,
    adults_count: input.adultsCount,
    children_count: input.childrenCount,
    message: input.message ?? null,
    accommodation_subtotal: pricing.accommodationSubtotal,
    cleaning_fee_amount: pricing.cleaningFeeAmount,
    service_fee_amount: pricing.serviceFeeAmount,
    discount_amount: pricing.discountAmount,
    tax_amount: pricing.taxAmount,
    security_deposit_amount: pricing.securityDepositAmount,
    nightly_rate_breakdown: pricing.nightlyBreakdown,
    total_amount: pricing.totalAccommodationPrice,
    deposit_amount: pricing.depositAmount,
    balance_amount: pricing.balanceAmount,
    currency: pricing.currency,
    terms_agreed_at: now,
    cancellation_policy_agreed_at: now,
    communication_consent_at: now,
  };

  const statusPatch =
    input.initialStatus === 'confirmed'
      ? { status: 'confirmed' as const, reference: generateBookingReference() }
      : {
          status: 'accepted_awaiting_deposit' as const,
          hold_expires_at: new Date(Date.now() + settings.hold_period_hours * 60 * 60 * 1000).toISOString(),
          payment_token: generatePaymentToken(),
        };

  const { data, error } = await db
    .from('bookings')
    .insert({ ...basePatch, ...statusPatch })
    .select('*')
    .single();

  if (error || !data) {
    if (error?.code === EXCLUSION_VIOLATION) {
      throw new DoubleBookingError('These dates were just taken by another booking. Please choose different dates.');
    }
    throw new WorkflowError(`Could not create booking: ${error?.message}`);
  }

  await recordHistory(db, data.id, null, data.status, 'admin', 'Created manually by admin');

  await writeAuditLog(actor, {
    action: 'booking.create_manual',
    recordType: 'booking',
    recordId: data.id,
    changes: { checkIn: input.checkIn, checkOut: input.checkOut, initialStatus: input.initialStatus },
  });

  if (data.status === 'accepted_awaiting_deposit') {
    const paymentLink = await createPaymentLink(data, 'deposit');
    await sendDepositLinkEmail(data, paymentLink.url);
  }

  return data;
}

const EDITABLE_GUEST_FIELDS = [
  'guest_first_name',
  'guest_last_name',
  'guest_email',
  'guest_phone',
  'guest_country',
] as const;

export interface GuestInfoUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
}

/** Admin edits guest contact details (e.g. a typo in the email, an updated phone number). */
export async function updateGuestInfo(
  bookingId: string,
  actor: { id: string; email: string },
  input: GuestInfoUpdate,
): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const before = await getBookingOrThrow(db, bookingId);

  const patch: Partial<Booking> = {};
  if (input.firstName !== undefined) patch.guest_first_name = input.firstName;
  if (input.lastName !== undefined) patch.guest_last_name = input.lastName;
  if (input.email !== undefined) patch.guest_email = input.email;
  if (input.phone !== undefined) patch.guest_phone = input.phone;
  if (input.country !== undefined) patch.guest_country = input.country;

  if (Object.keys(patch).length === 0) {
    return before;
  }

  if (patch.guest_first_name !== undefined || patch.guest_last_name !== undefined) {
    const firstName = patch.guest_first_name ?? before.guest_first_name ?? '';
    const lastName = patch.guest_last_name ?? before.guest_last_name ?? '';
    patch.guest_name = `${firstName} ${lastName}`.trim();
  }

  const { data: updated, error } = await db
    .from('bookings')
    .update(patch)
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not update guest details: ${error?.message}`);
  }

  const changes: Record<string, unknown> = {};
  for (const field of EDITABLE_GUEST_FIELDS) {
    if (field in patch && before[field] !== updated[field]) {
      changes[field] = { before: before[field], after: updated[field] };
    }
  }

  await writeAuditLog(actor, {
    action: 'booking.update_guest_info',
    recordType: 'booking',
    recordId: bookingId,
    changes,
  });

  return updated;
}

/** Admin sets/replaces the private internal notes on a booking (never shown to the guest). */
export async function updateInternalNotes(
  bookingId: string,
  actor: { id: string; email: string },
  notes: string,
): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const before = await getBookingOrThrow(db, bookingId);

  const { data: updated, error } = await db
    .from('bookings')
    .update({ admin_notes: notes })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not update notes: ${error?.message}`);
  }

  await writeAuditLog(actor, {
    action: 'booking.update_notes',
    recordType: 'booking',
    recordId: bookingId,
    changes: { before: before.admin_notes, after: updated.admin_notes },
  });

  return updated;
}

/** Records a note that guest contact happened (call, email outside the automated flow, WhatsApp, etc). */
export async function logGuestCommunication(
  bookingId: string,
  actor: { id: string; email: string },
  input: { channel: GuestCommunicationChannel; direction: 'outbound' | 'inbound'; summary: string },
): Promise<GuestCommunication> {
  const db = createAdminSupabaseClient();
  await getBookingOrThrow(db, bookingId);

  const { data, error } = await db
    .from('guest_communications')
    .insert({
      booking_id: bookingId,
      channel: input.channel,
      direction: input.direction,
      summary: input.summary,
      logged_by: actor.id,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new WorkflowError(`Could not log communication: ${error?.message}`);
  }

  await writeAuditLog(actor, {
    action: 'booking.log_communication',
    recordType: 'booking',
    recordId: bookingId,
    changes: { channel: input.channel, direction: input.direction },
  });

  return data;
}

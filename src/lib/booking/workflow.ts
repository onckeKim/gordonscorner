import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { bookingRules, calculateStayTotal } from '@/lib/config';
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
 * (never trust the client's read of the calendar) and computes pricing
 * from the central config, not from client-supplied amounts.
 */
export async function createBookingRequest(input: {
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  message?: string;
}): Promise<Booking> {
  const availability = await checkAvailability({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
  });

  if (!availability.available) {
    throw new WorkflowError(availability.reason ?? 'These dates are not available.');
  }

  const nights = Math.round(
    (new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const { totalAmount, depositAmount, balanceAmount } = calculateStayTotal(nights);

  const db = createAdminSupabaseClient();
  const { data, error } = await db
    .from('bookings')
    .insert({
      guest_name: input.guestName,
      guest_email: input.guestEmail,
      guest_phone: input.guestPhone ?? null,
      check_in: input.checkIn,
      check_out: input.checkOut,
      guests_count: input.guestsCount,
      message: input.message ?? null,
      status: 'pending_review',
      total_amount: totalAmount,
      deposit_amount: depositAmount,
      balance_amount: balanceAmount,
      currency: bookingRules.currency,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new WorkflowError(`Could not create booking: ${error?.message}`);
  }

  await recordHistory(db, data.id, null, 'pending_review', 'guest');

  await Promise.all([
    sendBookingReceivedEmail(data),
    sendAdminNewRequestEmail(data),
  ]);

  return data;
}

/**
 * Admin accepts a request: holds the dates (soft, until hold_expires_at),
 * generates a payment token + secure deposit link, and emails the guest.
 */
export async function acceptBooking(bookingId: string, adminId: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['pending_review', 'dates_proposed']);

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
      status: 'accepted',
      hold_expires_at: holdExpiresAt,
      payment_token: paymentToken,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not accept booking: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'accepted', 'admin', undefined);

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
    'pending_review',
    'info_requested',
    'dates_proposed',
    'accepted',
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
  assertStatus(booking, ['pending_review']);

  const { data: updated, error } = await db
    .from('bookings')
    .update({ status: 'info_requested', info_request_message: message })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not request info: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'info_requested', 'admin', message);
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
  assertStatus(booking, ['pending_review', 'info_requested']);

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
      status: 'dates_proposed',
      proposed_check_in: proposedCheckIn,
      proposed_check_out: proposedCheckOut,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not propose dates: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'dates_proposed', 'admin');
  await sendDatesProposedEmail(updated);

  return updated;
}

/**
 * Guest accepts the admin's proposed alternative dates: the booking's
 * dates are updated (re-pricing if the nights count changed) and it
 * returns to pending_review for a final admin acceptance.
 */
export async function guestAcceptsProposedDates(bookingId: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['dates_proposed']);

  if (!booking.proposed_check_in || !booking.proposed_check_out) {
    throw new WorkflowError('No proposed dates on this booking.');
  }

  const nights = Math.round(
    (new Date(booking.proposed_check_out).getTime() -
      new Date(booking.proposed_check_in).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const { totalAmount, depositAmount, balanceAmount } = calculateStayTotal(nights);

  const { data: updated, error } = await db
    .from('bookings')
    .update({
      status: 'pending_review',
      check_in: booking.proposed_check_in,
      check_out: booking.proposed_check_out,
      proposed_check_in: null,
      proposed_check_out: null,
      total_amount: totalAmount,
      deposit_amount: depositAmount,
      balance_amount: balanceAmount,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not update booking: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'pending_review', 'guest');
  return updated;
}

export async function guestDeclinesProposedDates(bookingId: string): Promise<Booking> {
  return declineBooking(bookingId, 'guest-declined-proposal', 'Guest declined proposed dates.');
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

  if (booking.status === 'confirmed' || booking.status === 'balance_paid') {
    return booking; // idempotent: webhook may fire more than once
  }

  assertStatus(booking, ['accepted']);

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

  await recordHistory(db, bookingId, booking.status, 'deposit_paid', 'system', 'Deposit paid');
  await recordHistory(db, bookingId, 'deposit_paid', 'confirmed', 'system', 'Booking confirmed');

  await Promise.all([sendBookingConfirmedEmail(updated), sendAdminConfirmedEmail(updated)]);

  return updated;
}

/** Admin manually records the remaining 50% balance as paid (e.g. cash/EFT on arrival). */
export async function markBalancePaid(bookingId: string, adminId: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['confirmed']);

  const { data: updated, error } = await db
    .from('bookings')
    .update({
      status: 'balance_paid',
      balance_paid_at: new Date().toISOString(),
      balance_marked_paid_by: adminId,
    })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not record balance payment: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'balance_paid', 'admin');
  return updated;
}

/** Called by the payment webhook when a guest pays the balance online (self-serve). */
export async function markBalancePaidViaPayment(bookingId: string): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);

  if (booking.status === 'balance_paid') {
    return booking; // idempotent
  }
  assertStatus(booking, ['confirmed']);

  const { data: updated, error } = await db
    .from('bookings')
    .update({ status: 'balance_paid', balance_paid_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new WorkflowError(`Could not record balance payment: ${error?.message}`);
  }

  await recordHistory(db, bookingId, booking.status, 'balance_paid', 'system', 'Paid online');
  return updated;
}

export async function cancelBooking(
  bookingId: string,
  adminId: string,
  reason?: string,
): Promise<Booking> {
  const db = createAdminSupabaseClient();
  const booking = await getBookingOrThrow(db, bookingId);
  assertStatus(booking, ['accepted', 'confirmed']);

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

/**
 * Releases dates from bookings whose accept-hold has expired without
 * payment. Intended to run on a schedule (see /api/cron/expire-holds).
 */
export async function expireStaleHolds(): Promise<number> {
  const db = createAdminSupabaseClient();
  const { data: expired, error } = await db
    .from('bookings')
    .select('*')
    .eq('status', 'accepted')
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

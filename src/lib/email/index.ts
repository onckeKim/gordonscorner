import 'server-only';
import { siteConfig } from '@/lib/config';
import { sendViaResend } from './resend';
import { sendViaDevAdapter } from './dev-adapter';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import * as templates from './templates';
import type { EmailContent } from './templates';
import type { Booking, Payment } from '@/types/database';

/** Internal inbox that receives admin notifications — server-only, not the public contact email. */
function adminNotificationEmail(): string {
  return process.env.ADMIN_NOTIFICATION_EMAIL ?? siteConfig.contactEmail;
}

interface SendMeta {
  /** Stable identifier for the email_log/admin "resend" UI — e.g. 'booking_received', 'deposit_link'. */
  emailType: string;
  bookingId?: string;
  bookingReference?: string | null;
}

/**
 * Every outbound email in the app goes through this one function, which:
 *  1. Sends via Resend (or the console dev adapter when RESEND_API_KEY isn't set).
 *  2. Logs the attempt — type, recipient, booking reference, date, delivery
 *     status, provider message id, and failure reason — to `email_log`,
 *     regardless of whether the send succeeded. This is the audit trail
 *     the admin portal reads for "Resend email" / delivery history.
 *  3. Never throws — a failed email must never take down a booking-status
 *     transition; the failure is only visible in the log and the console.
 */
async function send(to: string, content: EmailContent, meta: SendMeta): Promise<void> {
  const hasResendKey = Boolean(process.env.RESEND_API_KEY);
  const provider = hasResendKey ? 'resend' : 'dev';
  let messageId: string | null = null;
  let failureReason: string | null = null;

  try {
    const result = hasResendKey ? await sendViaResend(to, content) : await sendViaDevAdapter(to, content);
    messageId = result.messageId;
  } catch (err) {
    failureReason = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(`Failed to send email "${content.subject}" to ${to}:`, err);
  }

  try {
    const db = createAdminSupabaseClient();
    await db.from('email_log').insert({
      email_type: meta.emailType,
      recipient: to,
      booking_id: meta.bookingId ?? null,
      booking_reference: meta.bookingReference ?? null,
      status: failureReason ? 'failed' : 'sent',
      provider,
      provider_message_id: messageId,
      failure_reason: failureReason,
    });
  } catch (logErr) {
    // eslint-disable-next-line no-console
    console.error('Failed to write email_log entry:', logErr);
  }
}

function bookingMeta(emailType: string, booking: Booking): SendMeta {
  return { emailType, bookingId: booking.id, bookingReference: booking.reference };
}

// 1. Booking request received
export async function sendBookingReceivedEmail(booking: Booking) {
  await send(booking.guest_email, templates.bookingReceivedEmail(booking), bookingMeta('booking_received', booking));
}

// 2. New booking request notification (admin)
export async function sendAdminNewRequestEmail(booking: Booking) {
  await send(adminNotificationEmail(), templates.adminNewRequestEmail(booking), bookingMeta('admin_new_request', booking));
}

// 3. Additional information requested
export async function sendInfoRequestedEmail(booking: Booking, message: string) {
  await send(booking.guest_email, templates.infoRequestedEmail(booking, message), bookingMeta('info_requested', booking));
}

// 4. Alternative dates proposed
export async function sendDatesProposedEmail(booking: Booking) {
  await send(booking.guest_email, templates.datesProposedEmail(booking), bookingMeta('dates_proposed', booking));
}

// 5. Booking request accepted (standalone notice — see templates.ts header comment)
export async function sendBookingAcceptedEmail(booking: Booking) {
  await send(booking.guest_email, templates.bookingAcceptedEmail(booking), bookingMeta('booking_accepted', booking));
}

// 6. 50% deposit payment link
export async function sendDepositLinkEmail(booking: Booking, paymentUrl: string) {
  await send(booking.guest_email, templates.depositLinkEmail(booking, paymentUrl), bookingMeta('deposit_link', booking));
}

// 7. Deposit-payment reminder
export async function sendDepositReminderEmail(booking: Booking, paymentUrl: string) {
  await send(booking.guest_email, templates.depositReminderEmail(booking, paymentUrl), bookingMeta('deposit_reminder', booking));
}

// 8. Deposit deadline approaching
export async function sendDepositDeadlineApproachingEmail(booking: Booking, paymentUrl: string) {
  await send(
    booking.guest_email,
    templates.depositDeadlineApproachingEmail(booking, paymentUrl),
    bookingMeta('deposit_deadline_approaching', booking),
  );
}

// 9. Deposit link expired
export async function sendDepositLinkExpiredEmail(booking: Booking) {
  await send(booking.guest_email, templates.depositLinkExpiredEmail(booking), bookingMeta('deposit_link_expired', booking));
}

// 10. Payment failed
export async function sendPaymentFailedEmail(booking: Booking, paymentUrl: string, type: 'deposit' | 'balance') {
  await send(booking.guest_email, templates.paymentFailedEmail(booking, paymentUrl, type), bookingMeta('payment_failed', booking));
}

// 11 / 17. Deposit or balance received (payment receipt)
export async function sendReceiptEmail(booking: Booking, payment: Payment) {
  const emailType = payment.type === 'deposit' ? 'deposit_received' : 'balance_received';
  await send(booking.guest_email, templates.receiptEmail(booking, payment), bookingMeta(emailType, booking));
}

// 12. Booking confirmed
export async function sendBookingConfirmedEmail(booking: Booking, balanceDueDate?: string) {
  await send(
    booking.guest_email,
    templates.bookingConfirmedEmail(booking, balanceDueDate),
    bookingMeta('booking_confirmed', booking),
  );
}

export async function sendAdminConfirmedEmail(booking: Booking) {
  await send(adminNotificationEmail(), templates.adminConfirmedEmail(booking), bookingMeta('admin_confirmed', booking));
}

// 13. Booking declined
export async function sendDeclinedEmail(booking: Booking) {
  await send(booking.guest_email, templates.declinedEmail(booking), bookingMeta('booking_declined', booking));
}

// 14. Booking cancelled
export async function sendBookingCancelledEmail(booking: Booking) {
  await send(booking.guest_email, templates.bookingCancelledEmail(booking), bookingMeta('booking_cancelled', booking));
}

// 15. Refund processed
export async function sendRefundEmail(booking: Booking, payment: Payment) {
  await send(booking.guest_email, templates.refundEmail(booking, payment), bookingMeta('refund_processed', booking));
}

// 16. Remaining balance reminder
export async function sendBalanceReminderEmail(booking: Booking, dueDate: string) {
  await send(booking.guest_email, templates.balanceReminderEmail(booking, dueDate), bookingMeta('balance_reminder', booking));
}

export async function sendBalancePaymentLinkEmail(booking: Booking, paymentUrl: string) {
  await send(booking.guest_email, templates.balancePaymentLinkEmail(booking, paymentUrl), bookingMeta('balance_link', booking));
}

// 18. Pre-arrival information
export async function sendPreArrivalEmail(booking: Booking) {
  await send(booking.guest_email, templates.preArrivalEmail(booking), bookingMeta('pre_arrival', booking));
}

// 19. Check-in instructions
export async function sendCheckInInstructionsEmail(booking: Booking) {
  await send(booking.guest_email, templates.checkInInstructionsEmail(booking), bookingMeta('check_in_instructions', booking));
}

// 20. Check-out reminder
export async function sendCheckOutReminderEmail(booking: Booking) {
  await send(booking.guest_email, templates.checkOutReminderEmail(booking), bookingMeta('check_out_reminder', booking));
}

// 21. Post-stay thank-you
export async function sendPostStayThankYouEmail(booking: Booking) {
  await send(booking.guest_email, templates.postStayThankYouEmail(booking), bookingMeta('post_stay_thank_you', booking));
}

// 22. Review request
export async function sendReviewRequestEmail(booking: Booking) {
  await send(booking.guest_email, templates.reviewRequestEmail(booking), bookingMeta('review_request', booking));
}

export async function sendPaymentLinkResentEmail(booking: Booking, paymentUrl: string, type: 'deposit' | 'balance') {
  await send(
    booking.guest_email,
    templates.paymentLinkResentEmail(booking, paymentUrl, type),
    bookingMeta(type === 'deposit' ? 'deposit_link_resent' : 'balance_link_resent', booking),
  );
}

export async function sendEnquiryEmail(enquiry: { name: string; email: string; message: string }) {
  await send(adminNotificationEmail(), templates.enquiryEmail(enquiry), { emailType: 'enquiry' });
}

export async function sendPrivacyRequestEmail(request: {
  requestType: 'export' | 'correction' | 'deletion';
  name: string;
  email: string;
  details?: string;
}) {
  await send(adminNotificationEmail(), templates.privacyRequestEmail(request), { emailType: 'privacy_request' });
}

import 'server-only';
import { siteConfig } from '@/lib/config';
import { sendViaResend } from './resend';
import { sendViaDevAdapter } from './dev-adapter';
import * as templates from './templates';
import type { EmailContent } from './templates';
import type { Booking, Payment } from '@/types/database';

/** Internal inbox that receives admin notifications — server-only, not the public contact email. */
function adminNotificationEmail(): string {
  return process.env.ADMIN_NOTIFICATION_EMAIL ?? siteConfig.contactEmail;
}

async function send(to: string, content: EmailContent): Promise<void> {
  const hasResendKey = Boolean(process.env.RESEND_API_KEY);
  try {
    if (hasResendKey) {
      await sendViaResend(to, content);
    } else {
      await sendViaDevAdapter(to, content);
    }
  } catch (err) {
    // Email delivery must never take down a booking-status transition.
    // eslint-disable-next-line no-console
    console.error(`Failed to send email "${content.subject}" to ${to}:`, err);
  }
}

export async function sendBookingReceivedEmail(booking: Booking) {
  await send(booking.guest_email, templates.bookingReceivedEmail(booking));
}

export async function sendAdminNewRequestEmail(booking: Booking) {
  await send(adminNotificationEmail(), templates.adminNewRequestEmail(booking));
}

export async function sendDepositLinkEmail(booking: Booking, paymentUrl: string) {
  await send(booking.guest_email, templates.depositLinkEmail(booking, paymentUrl));
}

export async function sendDeclinedEmail(booking: Booking) {
  await send(booking.guest_email, templates.declinedEmail(booking));
}

export async function sendInfoRequestedEmail(booking: Booking, message: string) {
  await send(booking.guest_email, templates.infoRequestedEmail(booking, message));
}

export async function sendDatesProposedEmail(booking: Booking) {
  await send(booking.guest_email, templates.datesProposedEmail(booking));
}

export async function sendBookingConfirmedEmail(booking: Booking) {
  await send(booking.guest_email, templates.bookingConfirmedEmail(booking));
}

export async function sendAdminConfirmedEmail(booking: Booking) {
  await send(adminNotificationEmail(), templates.adminConfirmedEmail(booking));
}

export async function sendBalancePaymentLinkEmail(booking: Booking, paymentUrl: string) {
  await send(booking.guest_email, templates.balancePaymentLinkEmail(booking, paymentUrl));
}

export async function sendEnquiryEmail(enquiry: { name: string; email: string; message: string }) {
  await send(adminNotificationEmail(), templates.enquiryEmail(enquiry));
}

export async function sendReceiptEmail(booking: Booking, payment: Payment) {
  await send(booking.guest_email, templates.receiptEmail(booking, payment));
}

export async function sendRefundEmail(booking: Booking, payment: Payment) {
  await send(booking.guest_email, templates.refundEmail(booking, payment));
}

export async function sendPaymentLinkResentEmail(
  booking: Booking,
  paymentUrl: string,
  type: 'deposit' | 'balance',
) {
  await send(booking.guest_email, templates.paymentLinkResentEmail(booking, paymentUrl, type));
}

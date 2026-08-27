import { siteConfig, bookingRules } from '@/lib/config';
import type { Booking } from '@/types/database';

export interface EmailContent {
  subject: string;
  html: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

function shell(title: string, bodyHtml: string): string {
  return `
  <div style="font-family: Georgia, 'Times New Roman', serif; background:#F5F2ED; padding:32px;">
    <div style="max-width:560px;margin:0 auto;background:#FCFBF8;border-radius:16px;overflow:hidden;border:1px solid #DED8CE;">
      <div style="background:#2F4641;padding:28px 32px;">
        <h1 style="color:#FCFBF8;font-size:22px;margin:0;letter-spacing:0.04em;">${siteConfig.propertyName}</h1>
      </div>
      <div style="padding:32px;color:#252525;font-size:15px;line-height:1.6;">
        <h2 style="font-size:19px;margin-top:0;color:#B4852D;">${title}</h2>
        ${bodyHtml}
      </div>
      <div style="padding:20px 32px;background:#F5F2ED;color:#6F6A63;font-size:12px;">
        ${siteConfig.propertyName} · ${siteConfig.address} · ${siteConfig.contactEmail}
      </div>
    </div>
  </div>`;
}

function bookingSummary(booking: Booking): string {
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:4px 0;color:#6F6A63;">Check-in</td><td style="padding:4px 0;text-align:right;">${formatDate(booking.check_in)}</td></tr>
      <tr><td style="padding:4px 0;color:#6F6A63;">Check-out</td><td style="padding:4px 0;text-align:right;">${formatDate(booking.check_out)}</td></tr>
      <tr><td style="padding:4px 0;color:#6F6A63;">Nights</td><td style="padding:4px 0;text-align:right;">${booking.nights}</td></tr>
      <tr><td style="padding:4px 0;color:#6F6A63;">Guests</td><td style="padding:4px 0;text-align:right;">${booking.guests_count}</td></tr>
      <tr><td style="padding:4px 0;color:#6F6A63;">Total</td><td style="padding:4px 0;text-align:right;">${formatZar(booking.total_amount)}</td></tr>
    </table>`;
}

export function bookingReceivedEmail(booking: Booking): EmailContent {
  return {
    subject: `We've received your booking request — ${siteConfig.propertyName}`,
    html: shell(
      `Thank you, ${booking.guest_name}`,
      `<p>We've received your booking request and will review it shortly. You'll hear from us within 24 hours.</p>${bookingSummary(booking)}<p>Track your request anytime: <a href="${siteConfig.siteUrl}/booking/${booking.id}">${siteConfig.siteUrl}/booking/${booking.id}</a></p>`,
    ),
  };
}

export function adminNewRequestEmail(booking: Booking): EmailContent {
  return {
    subject: `New booking request from ${booking.guest_name}`,
    html: shell(
      'New booking request',
      `<p>${booking.guest_name} (${booking.guest_email}${booking.guest_phone ? `, ${booking.guest_phone}` : ''}) requested a stay.</p>${bookingSummary(booking)}${booking.message ? `<p><em>${booking.message}</em></p>` : ''}`,
    ),
  };
}

export function depositLinkEmail(booking: Booking, paymentUrl: string): EmailContent {
  return {
    subject: `Your booking is approved — secure it with a deposit`,
    html: shell(
      'Good news — your stay is approved',
      `<p>Please secure your booking with a ${Math.round(bookingRules.depositRate * 100)}% deposit of <strong>${formatZar(booking.deposit_amount)}</strong>. Your dates are held for ${bookingRules.holdExpiryHours} hours.</p>
       ${bookingSummary(booking)}
       <p style="text-align:center;margin:28px 0;">
         <a href="${paymentUrl}" style="background:#B4852D;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:15px;">Pay deposit securely</a>
       </p>`,
    ),
  };
}

export function declinedEmail(booking: Booking): EmailContent {
  return {
    subject: `Update on your booking request`,
    html: shell(
      'About your request',
      `<p>Unfortunately we're unable to accommodate this request.${booking.decline_reason ? ` ${booking.decline_reason}` : ''}</p>${bookingSummary(booking)}`,
    ),
  };
}

export function infoRequestedEmail(booking: Booking, message: string): EmailContent {
  return {
    subject: `A quick question about your booking request`,
    html: shell('We need a little more information', `<p>${message}</p>${bookingSummary(booking)}`),
  };
}

export function datesProposedEmail(booking: Booking): EmailContent {
  return {
    subject: `Alternative dates for your stay`,
    html: shell(
      'We have an alternative for you',
      `<p>Your original dates aren't available, but we can offer:</p>
       <table style="width:100%;border-collapse:collapse;margin:16px 0;">
         <tr><td style="padding:4px 0;color:#6F6A63;">Proposed check-in</td><td style="padding:4px 0;text-align:right;">${booking.proposed_check_in ? formatDate(booking.proposed_check_in) : ''}</td></tr>
         <tr><td style="padding:4px 0;color:#6F6A63;">Proposed check-out</td><td style="padding:4px 0;text-align:right;">${booking.proposed_check_out ? formatDate(booking.proposed_check_out) : ''}</td></tr>
       </table>
       <p>Visit your <a href="${siteConfig.siteUrl}/booking/${booking.id}">booking status page</a> to accept or decline.</p>`,
    ),
  };
}

export function bookingConfirmedEmail(booking: Booking): EmailContent {
  return {
    subject: `Booking confirmed — ${booking.reference}`,
    html: shell(
      `You're confirmed, ${booking.guest_name}!`,
      `<p>Your deposit has been received and your stay is confirmed.</p>
       <p style="font-size:18px;letter-spacing:0.06em;"><strong>${booking.reference}</strong></p>
       ${bookingSummary(booking)}
       <p>Remaining balance due: <strong>${formatZar(booking.balance_amount)}</strong> (payable on arrival or as arranged).</p>
       <p>View your booking anytime: <a href="${siteConfig.siteUrl}/booking/${booking.id}">${siteConfig.siteUrl}/booking/${booking.id}</a></p>`,
    ),
  };
}

export function adminConfirmedEmail(booking: Booking): EmailContent {
  return {
    subject: `Deposit paid — ${booking.reference} confirmed`,
    html: shell(
      'Booking confirmed',
      `<p>${booking.guest_name} paid their deposit. Booking ${booking.reference} is now confirmed.</p>${bookingSummary(booking)}`,
    ),
  };
}

export function balancePaymentLinkEmail(booking: Booking, paymentUrl: string): EmailContent {
  return {
    subject: `Settle your remaining balance — ${booking.reference}`,
    html: shell(
      'Remaining balance',
      `<p>Your remaining balance of <strong>${formatZar(booking.balance_amount)}</strong> is due.</p>
       <p style="text-align:center;margin:28px 0;">
         <a href="${paymentUrl}" style="background:#B4852D;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-size:15px;">Pay balance securely</a>
       </p>`,
    ),
  };
}

export function enquiryEmail(enquiry: { name: string; email: string; message: string }): EmailContent {
  return {
    subject: `New enquiry from ${enquiry.name}`,
    html: shell(
      'New enquiry',
      `<p><strong>${enquiry.name}</strong> (${enquiry.email}) sent a message via the website:</p>
       <p style="white-space:pre-wrap;background:#F5F2ED;border-radius:8px;padding:14px 16px;">${enquiry.message}</p>
       <p><a href="mailto:${enquiry.email}">Reply to ${enquiry.name}</a></p>`,
    ),
  };
}

import { siteConfig, propertyDetails } from '@/lib/config';
import type { Booking, Payment } from '@/types/database';

/**
 * Every guest/admin email Gordon's Corner sends. Branded with the site's
 * real palette (ivory #F5F2ED, forest #2F4641, gold #B4852D — see
 * globals.css) and a CSS recreation of the script wordmark (no raster logo
 * file exists yet — see README "Assumptions & placeholders"), built as a
 * full mobile-friendly HTML document with an automatically generated
 * plain-text alternative for every send (see stripHtmlToText below).
 *
 * NEVER reference `booking.admin_notes` (or any other admin-only field)
 * from a template in this file — every function here renders content a
 * guest or the admin notification inbox will actually receive.
 */

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatZar(amount: number, currency = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount);
}

/**
 * Escapes user-supplied text before it's interpolated into an HTML email
 * body. Every guest-controlled field (name, message, enquiry text, ...) and
 * every admin-typed free-text field (decline reason, note, ...) must be
 * passed through this before landing in a template string below — none of
 * this file uses a templating engine that escapes automatically.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusLabel(status: Booking['status']): string {
  return status
    .split('_')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

/** Best-effort HTML → plain-text so every send gets a real text/plain part, not a duplicate of the HTML. */
function stripHtmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&mdash;/g, '—')
    .replace(/&middot;/g, '·')
    .replace(/&rarr;/g, '->')
    .replace(/&minus;/g, '-')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Full branded HTML document + a matching plain-text part for one email. */
function buildEmail(subject: string, title: string, bodyHtml: string): EmailContent {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&display=swap');
  body { margin:0; padding:0; background:#F5F2ED; }
  @media (max-width: 480px) {
    .gc-container { width:100% !important; border-radius:0 !important; }
    .gc-pad { padding-left:20px !important; padding-right:20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F5F2ED;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${title}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2ED;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="gc-container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#FCFBF8;border-radius:16px;overflow:hidden;border:1px solid #DED8CE;font-family:Georgia,'Times New Roman',serif;">
          <tr>
            <td align="center" style="background:#2F4641;padding:26px 32px;">
              <div style="font-family:'Alex Brush',cursive,Georgia,serif;font-size:34px;line-height:1;color:#FCFBF8;">Gordon&rsquo;s</div>
              <div style="margin-top:4px;font-size:12px;letter-spacing:0.4em;text-transform:uppercase;color:#FCFBF8;">Corner</div>
            </td>
          </tr>
          <tr>
            <td class="gc-pad" style="padding:32px;color:#252525;font-size:15px;line-height:1.65;">
              <h1 style="font-size:20px;margin:0 0 16px;color:#B4852D;font-weight:600;">${title}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="gc-pad" style="padding:20px 32px;background:#F5F2ED;color:#6F6A63;font-size:12px;line-height:1.6;">
              ${siteConfig.propertyName} &middot; ${siteConfig.addressLine1}, ${siteConfig.addressLine2}<br />
              <a href="mailto:${siteConfig.contactEmail}" style="color:#6F6A63;">${siteConfig.contactEmail}</a> &middot;
              <a href="tel:${siteConfig.contactPhone}" style="color:#6F6A63;">${siteConfig.contactPhone}</a><br />
              <a href="${siteConfig.siteUrl}/policies" style="color:#6F6A63;">Policies</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text =
    `${siteConfig.propertyName}\n${title}\n${'='.repeat(Math.min(60, title.length + 4))}\n\n` +
    `${stripHtmlToText(bodyHtml)}\n\n` +
    `--\n${siteConfig.propertyName} · ${siteConfig.addressLine1}, ${siteConfig.addressLine2}\n` +
    `${siteConfig.contactEmail} · ${siteConfig.contactPhone}\nPolicies: ${siteConfig.siteUrl}/policies`;

  return { subject, html, text };
}

function ctaButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px auto;"><tr><td align="center" style="border-radius:999px;background:#B4852D;">
    <a href="${url}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${label}</a>
  </td></tr></table>`;
}

function viewBookingUrl(booking: Booking): string {
  return `${siteConfig.siteUrl}/booking/${booking.id}`;
}

function policiesUrl(anchor?: string): string {
  return `${siteConfig.siteUrl}/policies${anchor ? `#${anchor}` : ''}`;
}

function viewBookingLink(booking: Booking): string {
  return `<p>View your booking anytime: <a href="${viewBookingUrl(booking)}" style="color:#B4852D;">${viewBookingUrl(booking)}</a></p>`;
}

function bookingSummary(booking: Booking): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:4px 0;color:#6F6A63;">Status</td><td style="padding:4px 0;text-align:right;">${statusLabel(booking.status)}</td></tr>
      <tr><td style="padding:4px 0;color:#6F6A63;">Check-in</td><td style="padding:4px 0;text-align:right;">${formatDate(booking.check_in)}</td></tr>
      <tr><td style="padding:4px 0;color:#6F6A63;">Check-out</td><td style="padding:4px 0;text-align:right;">${formatDate(booking.check_out)}</td></tr>
      <tr><td style="padding:4px 0;color:#6F6A63;">Nights</td><td style="padding:4px 0;text-align:right;">${booking.nights}</td></tr>
      <tr><td style="padding:4px 0;color:#6F6A63;">Guests</td><td style="padding:4px 0;text-align:right;">${booking.guests_count}</td></tr>
      <tr><td style="padding:4px 0;color:#6F6A63;">Total</td><td style="padding:4px 0;text-align:right;">${formatZar(booking.total_amount, booking.currency)}</td></tr>
    </table>`;
}

function nextSteps(items: string[]): string {
  return `<div style="margin:20px 0;padding:16px 18px;background:#F5F2ED;border-radius:10px;">
    <p style="margin:0 0 8px;font-weight:600;color:#252525;">Next steps</p>
    <ul style="margin:0;padding-left:18px;color:#252525;">
      ${items.map((i) => `<li style="margin:4px 0;">${i}</li>`).join('')}
    </ul>
  </div>`;
}

// ---------------------------------------------------------------------------
// 1. Booking request received
// ---------------------------------------------------------------------------
export function bookingReceivedEmail(booking: Booking): EmailContent {
  return buildEmail(
    `We've received your booking request — ${siteConfig.propertyName}`,
    `Thank you, ${escapeHtml(booking.guest_name)}`,
    `<p>We've received your booking request and will review it shortly. You'll hear from us within 24 hours.</p>
     ${bookingSummary(booking)}
     ${viewBookingLink(booking)}`,
  );
}

// ---------------------------------------------------------------------------
// 2. New booking request notification (admin)
// ---------------------------------------------------------------------------
export function adminNewRequestEmail(booking: Booking): EmailContent {
  return buildEmail(
    `New booking request from ${escapeHtml(booking.guest_name)}`,
    'New booking request',
    `<p>${escapeHtml(booking.guest_name)} (${escapeHtml(booking.guest_email)}${booking.guest_phone ? `, ${escapeHtml(booking.guest_phone)}` : ''}) requested a stay.</p>
     ${bookingSummary(booking)}
     ${booking.message ? `<p><em>${escapeHtml(booking.message)}</em></p>` : ''}
     ${ctaButton(`${siteConfig.siteUrl}/admin/bookings/${booking.id}`, 'Review request')}`,
  );
}

// ---------------------------------------------------------------------------
// 3. Additional information requested
// ---------------------------------------------------------------------------
export function infoRequestedEmail(booking: Booking, message: string): EmailContent {
  return buildEmail(
    'A quick question about your booking request',
    'We need a little more information',
    `<p>${escapeHtml(message)}</p>${bookingSummary(booking)}${viewBookingLink(booking)}`,
  );
}

// ---------------------------------------------------------------------------
// 4. Alternative dates proposed
// ---------------------------------------------------------------------------
export function datesProposedEmail(booking: Booking): EmailContent {
  return buildEmail(
    'Alternative dates for your stay',
    'We have an alternative for you',
    `<p>Your original dates aren't available, but we can offer:</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
       <tr><td style="padding:4px 0;color:#6F6A63;">Proposed check-in</td><td style="padding:4px 0;text-align:right;">${booking.proposed_check_in ? formatDate(booking.proposed_check_in) : ''}</td></tr>
       <tr><td style="padding:4px 0;color:#6F6A63;">Proposed check-out</td><td style="padding:4px 0;text-align:right;">${booking.proposed_check_out ? formatDate(booking.proposed_check_out) : ''}</td></tr>
     </table>
     ${ctaButton(viewBookingUrl(booking), 'Accept or decline')}`,
  );
}

// ---------------------------------------------------------------------------
// 5. Booking request accepted (standalone notice — the deposit-link email
// below is what's actually sent automatically on acceptance; this one is
// available for admins to resend on its own via "Resend booking emails").
// ---------------------------------------------------------------------------
export function bookingAcceptedEmail(booking: Booking): EmailContent {
  return buildEmail(
    'Your booking request has been accepted',
    `Good news, ${escapeHtml(booking.guest_name)}!`,
    `<p>Your request for ${formatDate(booking.check_in)} &rarr; ${formatDate(booking.check_out)} has been accepted. We'll follow up with a secure link to pay your deposit and confirm your dates.</p>
     ${bookingSummary(booking)}
     ${viewBookingLink(booking)}`,
  );
}

// ---------------------------------------------------------------------------
// 6. 50% deposit payment link
// ---------------------------------------------------------------------------
export function depositLinkEmail(booking: Booking, paymentUrl: string): EmailContent {
  const depositPercent =
    booking.total_amount > 0 ? Math.round((booking.deposit_amount / booking.total_amount) * 100) : 50;
  const heldUntil = booking.hold_expires_at ? ` until ${formatDateTime(booking.hold_expires_at)}` : '';
  return buildEmail(
    'Your booking is approved — secure it with a deposit',
    'Good news — your stay is approved',
    `<p>Please secure your booking with a ${depositPercent}% deposit of <strong>${formatZar(booking.deposit_amount, booking.currency)}</strong>. Your dates are held${heldUntil}.</p>
     ${bookingSummary(booking)}
     ${ctaButton(paymentUrl, 'Pay deposit securely')}
     <p style="font-size:13px;color:#6F6A63;">Payment is processed securely by our payment provider — we never see or store your card details. See our <a href="${policiesUrl('cancellation')}" style="color:#B4852D;">cancellation policy</a>.</p>`,
  );
}

// ---------------------------------------------------------------------------
// 7. Deposit-payment reminder (scheduled, sent once while awaiting deposit)
// ---------------------------------------------------------------------------
export function depositReminderEmail(booking: Booking, paymentUrl: string): EmailContent {
  return buildEmail(
    'Reminder — your deposit is still outstanding',
    `Don't lose your dates, ${escapeHtml(booking.guest_name)}`,
    `<p>We haven't received your deposit yet for ${formatDate(booking.check_in)} &rarr; ${formatDate(booking.check_out)}. Your dates are only held temporarily${booking.hold_expires_at ? ` — until ${formatDateTime(booking.hold_expires_at)}` : ''}.</p>
     <p>Outstanding deposit: <strong>${formatZar(booking.deposit_amount, booking.currency)}</strong></p>
     ${ctaButton(paymentUrl, 'Pay deposit now')}`,
  );
}

// ---------------------------------------------------------------------------
// 8. Deposit deadline approaching (scheduled, closer to hold_expires_at)
// ---------------------------------------------------------------------------
export function depositDeadlineApproachingEmail(booking: Booking, paymentUrl: string): EmailContent {
  return buildEmail(
    'Your deposit deadline is approaching',
    'Time is running out to secure your dates',
    `<p>Your held dates for ${formatDate(booking.check_in)} &rarr; ${formatDate(booking.check_out)} will be released${booking.hold_expires_at ? ` at ${formatDateTime(booking.hold_expires_at)}` : ' soon'} if we don't receive your deposit.</p>
     <p>Outstanding deposit: <strong>${formatZar(booking.deposit_amount, booking.currency)}</strong></p>
     ${ctaButton(paymentUrl, 'Pay deposit now')}`,
  );
}

// ---------------------------------------------------------------------------
// 9. Deposit link expired
// ---------------------------------------------------------------------------
export function depositLinkExpiredEmail(booking: Booking): EmailContent {
  return buildEmail(
    'Your held dates have been released',
    'Your payment window has expired',
    `<p>We didn't receive your deposit in time, so your held dates (${formatDate(booking.check_in)} &rarr; ${formatDate(booking.check_out)}) have been released and may now be booked by someone else.</p>
     <p>If you'd still like to stay with us, please get in touch or submit a new request — we're happy to check availability again.</p>
     <p><a href="${siteConfig.siteUrl}/book" style="color:#B4852D;">Start a new request</a></p>`,
  );
}

// ---------------------------------------------------------------------------
// 10. Payment failed
// ---------------------------------------------------------------------------
export function paymentFailedEmail(booking: Booking, paymentUrl: string, type: 'deposit' | 'balance'): EmailContent {
  const amount = type === 'deposit' ? booking.deposit_amount : booking.balance_amount;
  return buildEmail(
    'Payment unsuccessful',
    'Your payment didn’t go through',
    `<p>Your ${type} payment of <strong>${formatZar(amount, booking.currency)}</strong> for ${escapeHtml(booking.reference ?? 'your booking')} wasn't successful — this can happen for a number of reasons (card declined, session timed out, or the payment was cancelled).</p>
     <p>No amount has been charged. Your dates are still held${booking.hold_expires_at ? ` until ${formatDateTime(booking.hold_expires_at)}` : ''} — please try again.</p>
     ${ctaButton(paymentUrl, 'Try payment again')}`,
  );
}

// ---------------------------------------------------------------------------
// 11. Deposit received — see receiptEmail() below (shared with #17, balance received)
// ---------------------------------------------------------------------------
export function receiptEmail(booking: Booking, payment: Payment): EmailContent {
  const paidAt = payment.paid_at ?? payment.created_at;
  const label = payment.type === 'deposit' ? 'deposit' : 'balance';
  return buildEmail(
    `Receipt — ${label} payment received (${escapeHtml(booking.reference ?? booking.id.slice(0, 8))})`,
    'Payment receipt',
    `<p>Thank you — we've received your ${label} payment.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
       <tr><td style="padding:4px 0;color:#6F6A63;">Amount paid</td><td style="padding:4px 0;text-align:right;"><strong>${formatZar(payment.amount, booking.currency)}</strong></td></tr>
       <tr><td style="padding:4px 0;color:#6F6A63;">Currency</td><td style="padding:4px 0;text-align:right;">${booking.currency}</td></tr>
       <tr><td style="padding:4px 0;color:#6F6A63;">Date</td><td style="padding:4px 0;text-align:right;">${formatDate(paidAt)}</td></tr>
       <tr><td style="padding:4px 0;color:#6F6A63;">Payment method</td><td style="padding:4px 0;text-align:right;text-transform:capitalize;">${payment.provider}</td></tr>
       <tr><td style="padding:4px 0;color:#6F6A63;">Reference</td><td style="padding:4px 0;text-align:right;">${escapeHtml(payment.provider_reference ?? payment.id.slice(0, 8))}</td></tr>
       ${booking.reference ? `<tr><td style="padding:4px 0;color:#6F6A63;">Booking reference</td><td style="padding:4px 0;text-align:right;">${escapeHtml(booking.reference)}</td></tr>` : ''}
     </table>
     ${bookingSummary(booking)}
     ${viewBookingLink(booking)}`,
  );
}

// ---------------------------------------------------------------------------
// 12. Booking confirmed
// ---------------------------------------------------------------------------
export function bookingConfirmedEmail(booking: Booking, balanceDueDate?: string): EmailContent {
  const depositPercent =
    booking.total_amount > 0 ? Math.round((booking.deposit_amount / booking.total_amount) * 100) : 50;
  return buildEmail(
    `Booking confirmed — ${booking.reference}`,
    `You're confirmed, ${escapeHtml(booking.guest_name)}!`,
    `<p>Your deposit has been received and your stay is confirmed.</p>
     <p style="font-size:18px;letter-spacing:0.06em;"><strong>${escapeHtml(booking.reference ?? '')}</strong></p>
     ${bookingSummary(booking)}
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0 16px;">
       <tr><td style="padding:4px 0;color:#6F6A63;">Deposit paid (${depositPercent}%)</td><td style="padding:4px 0;text-align:right;">${formatZar(booking.deposit_amount, booking.currency)}</td></tr>
       <tr><td style="padding:4px 0;color:#6F6A63;">Remaining balance</td><td style="padding:4px 0;text-align:right;"><strong>${formatZar(booking.balance_amount, booking.currency)}</strong></td></tr>
       ${balanceDueDate ? `<tr><td style="padding:4px 0;color:#6F6A63;">Balance due by</td><td style="padding:4px 0;text-align:right;">${formatDate(balanceDueDate)}</td></tr>` : ''}
       <tr><td style="padding:4px 0;color:#6F6A63;">Check-in time</td><td style="padding:4px 0;text-align:right;">${propertyDetails.checkInTime}</td></tr>
       <tr><td style="padding:4px 0;color:#6F6A63;">Check-out time</td><td style="padding:4px 0;text-align:right;">${propertyDetails.checkOutTime}</td></tr>
     </table>
     <p style="color:#6F6A63;">Property address (confirmed guests only): ${siteConfig.addressLine1}, ${siteConfig.addressLine2}, ${siteConfig.addressCountry}</p>
     ${nextSteps([
       balanceDueDate
         ? `Pay the remaining balance of ${formatZar(booking.balance_amount, booking.currency)} by ${formatDate(balanceDueDate)}.`
         : `Pay the remaining balance of ${formatZar(booking.balance_amount, booking.currency)} on arrival or as arranged.`,
       "We'll email detailed check-in instructions closer to your stay.",
       `Read our <a href="${policiesUrl()}" style="color:#B4852D;">booking, cancellation and house-rule policies</a>.`,
       `Questions? Reply to this email or contact us at ${siteConfig.contactPhone}.`,
     ])}
     ${viewBookingLink(booking)}`,
  );
}

// ---------------------------------------------------------------------------
// Admin: deposit paid notification
// ---------------------------------------------------------------------------
export function adminConfirmedEmail(booking: Booking): EmailContent {
  return buildEmail(
    `Deposit paid — ${booking.reference} confirmed`,
    'Booking confirmed',
    `<p>${escapeHtml(booking.guest_name)} paid their deposit. Booking ${escapeHtml(booking.reference ?? '')} is now confirmed.</p>${bookingSummary(booking)}`,
  );
}

// ---------------------------------------------------------------------------
// 13. Booking declined
// ---------------------------------------------------------------------------
export function declinedEmail(booking: Booking): EmailContent {
  return buildEmail(
    'Update on your booking request',
    'About your request',
    `<p>Unfortunately we're unable to accommodate this request.${booking.decline_reason ? ` ${escapeHtml(booking.decline_reason)}` : ''}</p>
     ${bookingSummary(booking)}
     <p>We'd love to help with different dates — <a href="${siteConfig.siteUrl}/book" style="color:#B4852D;">submit a new request</a> any time.</p>`,
  );
}

// ---------------------------------------------------------------------------
// 14. Booking cancelled
// ---------------------------------------------------------------------------
export function bookingCancelledEmail(booking: Booking): EmailContent {
  return buildEmail(
    `Booking cancelled — ${escapeHtml(booking.reference ?? booking.id.slice(0, 8))}`,
    'Your booking has been cancelled',
    `<p>Your booking for ${formatDate(booking.check_in)} &rarr; ${formatDate(booking.check_out)} has been cancelled.${booking.decline_reason ? ` ${escapeHtml(booking.decline_reason)}` : ''}</p>
     ${bookingSummary(booking)}
     <p>If a deposit or balance was paid and a refund applies, it will be processed per our <a href="${policiesUrl('cancellation')}" style="color:#B4852D;">cancellation policy</a> — you'll receive a separate email once it's issued.</p>
     <p>Questions? Contact us at ${siteConfig.contactEmail} or ${siteConfig.contactPhone}.</p>`,
  );
}

// ---------------------------------------------------------------------------
// 15. Refund processed
// ---------------------------------------------------------------------------
export function refundEmail(booking: Booking, payment: Payment): EmailContent {
  return buildEmail(
    `Refund processed — ${escapeHtml(booking.reference ?? booking.id.slice(0, 8))}`,
    'Refund confirmation',
    `<p>A refund has been recorded for your booking.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
       <tr><td style="padding:4px 0;color:#6F6A63;">Amount refunded</td><td style="padding:4px 0;text-align:right;"><strong>${formatZar(payment.amount, booking.currency)}</strong></td></tr>
       <tr><td style="padding:4px 0;color:#6F6A63;">Date</td><td style="padding:4px 0;text-align:right;">${formatDate(payment.paid_at ?? payment.created_at)}</td></tr>
       ${payment.admin_note ? `<tr><td style="padding:4px 0;color:#6F6A63;">Note</td><td style="padding:4px 0;text-align:right;">${escapeHtml(payment.admin_note)}</td></tr>` : ''}
     </table>
     <p>Refunds are typically returned to your original payment method within 5&ndash;7 business days.</p>`,
  );
}

// ---------------------------------------------------------------------------
// 16. Remaining balance reminder (scheduled, ahead of the balance deadline)
// ---------------------------------------------------------------------------
export function balanceReminderEmail(booking: Booking, dueDate: string): EmailContent {
  return buildEmail(
    `Reminder — balance due for your stay`,
    'Your remaining balance is due soon',
    `<p>A reminder that the remaining balance for your stay (${formatDate(booking.check_in)} &rarr; ${formatDate(booking.check_out)}) is due by <strong>${formatDate(dueDate)}</strong>.</p>
     <p>Amount due: <strong>${formatZar(booking.balance_amount, booking.currency)}</strong></p>
     <p>Contact us to arrange payment, or reply to this email — we'll send a secure payment link on request.</p>
     ${viewBookingLink(booking)}`,
  );
}

// ---------------------------------------------------------------------------
// Balance payment link (on-demand, admin-triggered)
// ---------------------------------------------------------------------------
export function balancePaymentLinkEmail(booking: Booking, paymentUrl: string): EmailContent {
  return buildEmail(
    `Settle your remaining balance — ${booking.reference}`,
    'Remaining balance',
    `<p>Your remaining balance of <strong>${formatZar(booking.balance_amount, booking.currency)}</strong> is due.</p>
     ${ctaButton(paymentUrl, 'Pay balance securely')}`,
  );
}

// ---------------------------------------------------------------------------
// 17. Remaining balance received — see receiptEmail() above (payment.type === 'balance')
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 18. Pre-arrival information (scheduled, ~7 days before check-in)
// ---------------------------------------------------------------------------
export function preArrivalEmail(booking: Booking): EmailContent {
  return buildEmail(
    `Getting ready for your stay — ${formatDate(booking.check_in)}`,
    `Almost time, ${escapeHtml(booking.guest_name)}!`,
    `<p>Your stay is coming up:</p>
     ${bookingSummary(booking)}
     ${nextSteps([
       `Check-in from ${propertyDetails.checkInTime}, check-out by ${propertyDetails.checkOutTime}.`,
       `Property address (placeholder): ${siteConfig.addressLine1}, ${siteConfig.addressLine2}, ${siteConfig.addressCountry}.`,
       'Detailed check-in instructions (access code and parking) follow closer to your arrival date.',
       `Save our number for arrival day: ${siteConfig.emergencyContactPhone}.`,
     ])}
     ${viewBookingLink(booking)}`,
  );
}

// ---------------------------------------------------------------------------
// 19. Check-in instructions (scheduled, day before / morning of check-in)
// ---------------------------------------------------------------------------
export function checkInInstructionsEmail(booking: Booking): EmailContent {
  return buildEmail(
    `Check-in instructions — ${formatDate(booking.check_in)}`,
    'Here’s everything you need for arrival',
    `<p>We're looking forward to hosting you tomorrow. Here's how check-in works:</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
       <tr><td style="padding:4px 0;color:#6F6A63;">Check-in time</td><td style="padding:4px 0;text-align:right;">From ${propertyDetails.checkInTime}</td></tr>
       <tr><td style="padding:4px 0;color:#6F6A63;">Address</td><td style="padding:4px 0;text-align:right;">${siteConfig.addressLine1}, ${siteConfig.addressLine2}</td></tr>
       <tr><td style="padding:4px 0;color:#6F6A63;">Emergency contact</td><td style="padding:4px 0;text-align:right;">${siteConfig.emergencyContactName} — ${siteConfig.emergencyContactPhone}</td></tr>
     </table>
     <p>Access code and parking details are shared according to the specific access system in use at the property — if you haven't received them separately, please contact us directly and we'll send them right away.</p>
     ${viewBookingLink(booking)}`,
  );
}

// ---------------------------------------------------------------------------
// 20. Check-out reminder (scheduled, morning of check-out)
// ---------------------------------------------------------------------------
export function checkOutReminderEmail(booking: Booking): EmailContent {
  return buildEmail(
    'Check-out reminder',
    'A reminder about check-out today',
    `<p>Just a reminder that check-out is by <strong>${propertyDetails.checkOutTime}</strong> today.</p>
     ${nextSteps([
       'Please leave keys/access devices where instructed at check-in.',
       'A final walkthrough helps us process any refundable security deposit quickly.',
       'Let us know if you need a later check-out — we\'ll accommodate this where possible.',
     ])}
     <p>Thank you for staying with us — we hope it's been a wonderful trip.</p>`,
  );
}

// ---------------------------------------------------------------------------
// 21. Post-stay thank-you message (scheduled, day after check-out)
// ---------------------------------------------------------------------------
export function postStayThankYouEmail(booking: Booking): EmailContent {
  return buildEmail(
    `Thank you for staying with us, ${escapeHtml(booking.guest_name)}`,
    'It was a pleasure hosting you',
    `<p>Thank you for choosing ${siteConfig.propertyName} for your recent stay. We hope you left feeling rested and looked after.</p>
     <p>If anything wasn't quite right, please reply to this email directly — we read every message personally.</p>
     <p>We'd love to host you again — <a href="${siteConfig.siteUrl}/book" style="color:#B4852D;">check availability</a> any time.</p>`,
  );
}

// ---------------------------------------------------------------------------
// 22. Review request (scheduled, a few days after check-out)
// ---------------------------------------------------------------------------
export function reviewRequestEmail(booking: Booking): EmailContent {
  return buildEmail(
    'Would you share a quick review?',
    'How was your stay?',
    `<p>We hope you're settling back in well. If you have a moment, a short review helps other guests — and helps us keep improving.</p>
     ${ctaButton(`${siteConfig.siteUrl}/contact`, 'Share your feedback')}
     <p style="font-size:13px;color:#6F6A63;">This link opens our contact page for now — swap in your preferred review platform (Google, Airbnb, etc.) once you have one.</p>`,
  );
}

// ---------------------------------------------------------------------------
// Payment link resent (generic, admin-triggered)
// ---------------------------------------------------------------------------
export function paymentLinkResentEmail(booking: Booking, paymentUrl: string, type: 'deposit' | 'balance'): EmailContent {
  const amount = type === 'deposit' ? booking.deposit_amount : booking.balance_amount;
  return buildEmail(
    `Your payment link — ${escapeHtml(booking.reference ?? booking.id.slice(0, 8))}`,
    'Here’s your payment link again',
    `<p>As requested, here's a fresh link to pay your ${type === 'deposit' ? 'deposit' : 'remaining balance'} of <strong>${formatZar(amount, booking.currency)}</strong>.</p>
     ${ctaButton(paymentUrl, 'Pay securely')}`,
  );
}

export function enquiryEmail(enquiry: { name: string; email: string; message: string }): EmailContent {
  return buildEmail(
    `New enquiry from ${escapeHtml(enquiry.name)}`,
    'New enquiry',
    `<p><strong>${escapeHtml(enquiry.name)}</strong> (${escapeHtml(enquiry.email)}) sent a message via the website:</p>
     <p style="white-space:pre-wrap;background:#F5F2ED;border-radius:8px;padding:14px 16px;">${escapeHtml(enquiry.message)}</p>
     <p><a href="mailto:${encodeURIComponent(enquiry.email)}" style="color:#B4852D;">Reply to ${escapeHtml(enquiry.name)}</a></p>`,
  );
}

export function privacyRequestEmail(request: {
  requestType: 'export' | 'correction' | 'deletion';
  name: string;
  email: string;
  details?: string;
}): EmailContent {
  const typeLabel = { export: 'Data export', correction: 'Data correction', deletion: 'Data deletion' }[request.requestType];
  return buildEmail(
    `Privacy request: ${typeLabel} — ${escapeHtml(request.name)}`,
    'New privacy request',
    `<p>A guest submitted a <strong>${typeLabel.toLowerCase()}</strong> request via the website.</p>
     <p><strong>Name:</strong> ${escapeHtml(request.name)}<br/>
        <strong>Email:</strong> ${escapeHtml(request.email)}</p>
     ${request.details ? `<p style="white-space:pre-wrap;background:#F5F2ED;border-radius:8px;padding:14px 16px;">${escapeHtml(request.details)}</p>` : ''}
     <p>Review and action this request from the admin portal's Privacy requests page.</p>
     <p><a href="mailto:${encodeURIComponent(request.email)}" style="color:#B4852D;">Reply to ${escapeHtml(request.name)}</a></p>`,
  );
}

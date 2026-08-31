/**
 * Fires a conversion event to whichever third-party analytics scripts are
 * actually loaded (GA4's gtag, Meta/Facebook Pixel's fbq) — see
 * AnalyticsScripts.tsx, which only loads them once an admin configures an
 * id at /admin/seo. A no-op when neither is present, so this is always
 * safe to call. This is separate from — and does not replace — the
 * server-side analytics_events log (src/lib/analytics/log-event.ts), which
 * is the source of truth for /admin/analytics; this file exists only to
 * feed third-party platforms their own conversion data at the moment it
 * actually happens in the browser.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export type ConversionEvent =
  | 'contact_form_submitted'
  | 'booking_requested'
  | 'deposit_paid'
  | 'booking_confirmed';

const FB_EVENT_MAP: Partial<Record<ConversionEvent, string>> = {
  contact_form_submitted: 'Contact',
  booking_requested: 'Lead',
  deposit_paid: 'Purchase',
  booking_confirmed: 'Purchase',
};

export function trackConversion(event: ConversionEvent, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    window.gtag?.('event', event, params);
    const fbEvent = FB_EVENT_MAP[event];
    if (fbEvent) window.fbq?.('track', fbEvent, params);
  } catch {
    // Never let a broken/blocked analytics script break the guest's flow.
  }
}

'use client';

import { useEffect } from 'react';
import { trackConversion } from '@/lib/analytics/track';

const PAID_STATUSES = ['confirmed', 'checked_in', 'checked_out'];

/**
 * Fires the third-party conversion pixel (GA4/FB) once, only when the
 * booking's real DB status already reflects a successful payment at the
 * moment this page rendered — never on a bare redirect back from the
 * provider, which doesn't by itself mean payment succeeded. The
 * authoritative record (analytics_events, /admin/analytics) is written
 * server-side from the payment webhook regardless of whether a guest ever
 * lands back on this page — this component only feeds third-party pixels.
 */
export function PaymentReturnTracker({ status }: { status: string | null }) {
  useEffect(() => {
    if (status && PAID_STATUSES.includes(status)) {
      trackConversion('deposit_paid');
    }
  }, [status]);

  return null;
}

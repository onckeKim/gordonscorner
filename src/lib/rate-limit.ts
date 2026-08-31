import 'server-only';
import type { NextRequest } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/** Best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Atomic fixed-window rate limit check (see migration 0011's
 * rate_limit_hit() function — the increment-and-compare happens in one SQL
 * statement so concurrent requests can't race past the limit). Returns
 * true if the request is allowed, false if the caller has exceeded
 * `maxRequests` within `windowSeconds`.
 *
 * Fails open (allows the request) if the rate-limit check itself errors —
 * a database hiccup here must never take down booking submission, and
 * every protected route has other defenses behind it (validation,
 * idempotency, the double-booking constraint, admin review).
 */
export async function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
  try {
    const db = createAdminSupabaseClient();
    const { data, error } = await db.rpc('rate_limit_hit', {
      p_key: key,
      p_max_count: maxRequests,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.warn('Rate limit check failed, allowing request:', error.message);
      return true;
    }
    return data ?? true;
  } catch (err) {
    console.warn('Rate limit check threw, allowing request:', err);
    return true;
  }
}

/** Convenience: rate-limits by client IP under a named bucket, e.g. checkIpRateLimit(request, 'bookings', 10, 3600). */
export async function checkIpRateLimit(
  request: NextRequest,
  bucket: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  return checkRateLimit(`${bucket}:${clientIp(request)}`, maxRequests, windowSeconds);
}

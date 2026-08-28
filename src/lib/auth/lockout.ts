import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/** Repeated-failed-sign-in protection: lock an email out after too many failures in a short window. */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_WINDOW_MINUTES = 15;

export interface LockoutStatus {
  locked: boolean;
  /** ISO timestamp the lockout lifts, if locked. */
  lockedUntil?: string;
  attemptsRemaining?: number;
}

/**
 * Locked when there are `MAX_FAILED_ATTEMPTS` or more consecutive failures
 * for this email within the last `LOCKOUT_WINDOW_MINUTES` minutes with no
 * successful sign-in since. Case-insensitive on email.
 */
export async function getLockoutStatus(email: string): Promise<LockoutStatus> {
  const db = createAdminSupabaseClient();
  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { data } = await db
    .from('login_attempts')
    .select('success, created_at')
    .ilike('email', email)
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })
    .limit(MAX_FAILED_ATTEMPTS);

  const attempts = data ?? [];
  const consecutiveFailures: typeof attempts = [];
  for (const attempt of attempts) {
    if (attempt.success) break;
    consecutiveFailures.push(attempt);
  }

  if (consecutiveFailures.length >= MAX_FAILED_ATTEMPTS && consecutiveFailures[0]) {
    const mostRecent = consecutiveFailures[0].created_at;
    const lockedUntil = new Date(new Date(mostRecent).getTime() + LOCKOUT_WINDOW_MINUTES * 60 * 1000);
    if (lockedUntil.getTime() > Date.now()) {
      return { locked: true, lockedUntil: lockedUntil.toISOString() };
    }
  }

  return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS - consecutiveFailures.length };
}

export async function recordLoginAttempt(email: string, success: boolean, ip?: string | null): Promise<void> {
  const db = createAdminSupabaseClient();
  await db.from('login_attempts').insert({ email: email.toLowerCase(), success, ip: ip ?? null });
}

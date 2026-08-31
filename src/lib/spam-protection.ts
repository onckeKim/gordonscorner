/**
 * Dependency-free spam defenses for public forms (booking request, contact
 * enquiry): a honeypot field bots reliably fill in but real guests never
 * see, plus a minimum-fill-time check (a form "submitted" in under a
 * couple of seconds was almost certainly scripted, not typed by a human).
 *
 * This intentionally doesn't attempt to distinguish "spam" from
 * "legitimate" with certainty — checkHoneypot() returning false means
 * "silently accept and discard", never a hard rejection, so a false
 * positive never blocks a real guest with a confusing error. For stronger
 * protection against determined abuse, add Cloudflare Turnstile or
 * hCaptcha on top of this (see README "Connecting live services").
 *
 * No 'server-only' import — the timing fields are read on both the client
 * (to stamp formRenderedAt) and the server (to validate it).
 */

export interface HoneypotFields {
  /** Hidden field name real users never fill in — bots that auto-fill every input trip this. */
  website?: string;
  /** Client-stamped timestamp (Date.now()) from when the form first rendered. */
  formRenderedAt?: number;
}

const MIN_FILL_TIME_MS = 2000;

/** Returns false if the submission looks automated — caller should silently accept (never reveal detection to a bot). */
export function checkHoneypot(fields: HoneypotFields): boolean {
  if (fields.website) return false;
  if (fields.formRenderedAt != null) {
    const elapsed = Date.now() - fields.formRenderedAt;
    if (elapsed < MIN_FILL_TIME_MS) return false;
  }
  return true;
}

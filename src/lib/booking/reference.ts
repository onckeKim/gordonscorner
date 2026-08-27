import { randomInt } from 'crypto';

/**
 * Generates a human-friendly, unique-enough booking reference, e.g. "GC-2026-4V9K".
 * Uniqueness is enforced at the database level (bookings.reference is UNIQUE);
 * callers should retry on a rare collision.
 */
export function generateBookingReference(date: Date = new Date()): string {
  const year = date.getFullYear();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += alphabet.charAt(randomInt(alphabet.length));
  }
  return `GC-${year}-${suffix}`;
}

/** Generates an opaque, URL-safe token for the guest payment link. */
export function generatePaymentToken(): string {
  const bytes: string[] = [];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i += 1) {
    bytes.push(alphabet.charAt(randomInt(alphabet.length)));
  }
  return bytes.join('');
}

import { describe, expect, it } from 'vitest';
import { generateBookingReference, generatePaymentToken } from './reference';

describe('generateBookingReference', () => {
  it('formats as GC-<year>-<4 chars>', () => {
    const ref = generateBookingReference(new Date('2026-06-15T00:00:00Z'));
    expect(ref).toMatch(/^GC-2026-[A-Z0-9]{4}$/);
  });

  it('never includes visually ambiguous characters (0/O/1/I) in the random suffix', () => {
    // Only the suffix is randomly generated from the restricted alphabet —
    // the year segment naturally contains ordinary digits like '0' or '1'.
    for (let i = 0; i < 200; i += 1) {
      const suffix = generateBookingReference().split('-')[2];
      expect(suffix).not.toMatch(/[01OI]/);
    }
  });

  it('produces different suffixes across calls (not deterministic/reused)', () => {
    const refs = new Set(Array.from({ length: 50 }, () => generateBookingReference()));
    expect(refs.size).toBeGreaterThan(1);
  });
});

describe('generatePaymentToken', () => {
  it('generates a 32-character lowercase alphanumeric token', () => {
    const token = generatePaymentToken();
    expect(token).toMatch(/^[a-z0-9]{32}$/);
  });

  it('generates unique tokens across calls', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generatePaymentToken()));
    expect(tokens.size).toBe(50);
  });
});

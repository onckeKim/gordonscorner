import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { escapeHtml } from '@/lib/email/templates';
import { checkHoneypot } from '@/lib/spam-protection';
import { clientIp, checkRateLimit } from '@/lib/rate-limit';

describe('escapeHtml', () => {
  it('escapes the five HTML-significant characters', () => {
    expect(escapeHtml(`<script>alert('x')&"y"</script>`)).toBe(
      '&lt;script&gt;alert(&#39;x&#39;)&amp;&quot;y&quot;&lt;/script&gt;',
    );
  });

  it('neutralises a script-tag XSS payload typed into a guest field', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const escaped = escapeHtml(payload);
    expect(escaped).not.toContain('<img');
    expect(escaped).toContain('&lt;img');
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('Jane Doe')).toBe('Jane Doe');
  });

  it('is idempotent-safe to call on an empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('checkHoneypot', () => {
  const OLD_FILL_TIME = Date.now() - 5000; // 5s ago — passes the min-fill-time check

  it('passes a normal human submission (empty honeypot, filled slowly)', () => {
    expect(checkHoneypot({ website: '', formRenderedAt: OLD_FILL_TIME })).toBe(true);
  });

  it('flags a submission where the honeypot field was filled in', () => {
    expect(checkHoneypot({ website: 'http://spam.example', formRenderedAt: OLD_FILL_TIME })).toBe(false);
  });

  it('flags a submission that was completed faster than humanly plausible', () => {
    expect(checkHoneypot({ website: '', formRenderedAt: Date.now() })).toBe(false);
  });

  it('passes when no timing information is present at all', () => {
    expect(checkHoneypot({})).toBe(true);
  });
});

describe('clientIp', () => {
  function fakeRequest(headers: Record<string, string>): NextRequest {
    return {
      headers: {
        get: (name: string) => headers[name.toLowerCase()] ?? null,
      },
    } as unknown as NextRequest;
  }

  it('reads the first address from x-forwarded-for', () => {
    expect(clientIp(fakeRequest({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    expect(clientIp(fakeRequest({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7');
  });

  it('falls back to "unknown" when neither header is present', () => {
    expect(clientIp(fakeRequest({}))).toBe('unknown');
  });
});

describe('checkRateLimit (fail-open behaviour)', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('allows the request when the database is unreachable, rather than blocking guests', async () => {
    // No Supabase credentials configured (as in this sandbox) — the admin
    // client construction throws inside checkRateLimit's try block, which
    // must be treated as "allow", never as "deny".
    const allowed = await checkRateLimit('test-bucket:1.2.3.4', 5, 60);
    expect(allowed).toBe(true);
    if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });
});

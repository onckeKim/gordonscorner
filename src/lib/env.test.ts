import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const REQUIRED_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(30),
  SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(30),
  NEXT_PUBLIC_SITE_URL: 'https://gordonscorner.co.za',
};

const ENV_KEYS = [
  ...Object.keys(REQUIRED_ENV),
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'ADMIN_NOTIFICATION_EMAIL',
  'PAYMENT_PROVIDER',
  'PAYFAST_MERCHANT_ID',
  'PAYFAST_MERCHANT_KEY',
  'PAYFAST_PASSPHRASE',
  'PAYFAST_MODE',
  'CRON_SECRET',
  'ADMIN_SESSION_IDLE_MINUTES',
  'ANTHROPIC_API_KEY',
];

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.resetModules();
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.restoreAllMocks();
});

describe('validateEnv', () => {
  it('throws one aggregated error listing every missing required variable', async () => {
    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    expect(() => validateEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it('succeeds when all required variables are present and valid', async () => {
    Object.assign(process.env, REQUIRED_ENV);
    const { validateEnv } = await import('./env');
    const env = validateEnv();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe(REQUIRED_ENV.NEXT_PUBLIC_SUPABASE_URL);
    expect(env.PAYMENT_PROVIDER).toBe('dev'); // default
  });

  it('rejects a malformed URL even when the variable is present', async () => {
    Object.assign(process.env, REQUIRED_ENV, { NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' });
    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it('warns but does not throw when PAYMENT_PROVIDER=payfast is missing its credentials', async () => {
    Object.assign(process.env, REQUIRED_ENV, { PAYMENT_PROVIDER: 'payfast' });
    const { validateEnv } = await import('./env');
    expect(() => validateEnv()).not.toThrow();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('PAYMENT_PROVIDER=payfast'));
  });

  it('warns but does not throw when RESEND_API_KEY is absent', async () => {
    Object.assign(process.env, REQUIRED_ENV);
    const { validateEnv } = await import('./env');
    validateEnv();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('RESEND_API_KEY'));
  });

  it('caches the result so a second call does not re-parse (and returns the same object)', async () => {
    Object.assign(process.env, REQUIRED_ENV);
    const { validateEnv } = await import('./env');
    const first = validateEnv();
    process.env.NEXT_PUBLIC_SITE_URL = 'not-a-url-anymore';
    const second = validateEnv();
    expect(second).toBe(first);
  });
});

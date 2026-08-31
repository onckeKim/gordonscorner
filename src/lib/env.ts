import 'server-only';
import { z } from 'zod';

/**
 * Validates every environment variable the app depends on, once, at server
 * startup (see instrumentation.ts) — instead of the previous pattern of
 * scattered `process.env.X!` non-null assertions that only fail deep
 * inside a request handler with a confusing generic error. A misconfigured
 * deployment should fail loudly and immediately, listing every problem at
 * once, not on whichever code path happens to touch the missing var first.
 *
 * Required: the app cannot start without these (Supabase is the database).
 * Conditionally required / optional: validated when present, but a missing
 * value only logs a warning — matches the project's existing "dev mode"
 * philosophy (no RESEND_API_KEY -> console email adapter; PAYMENT_PROVIDER
 * unset/'dev' -> payment simulator).
 */

const envSchema = z.object({
  // Supabase — required, the app has no functionality without a database.
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ required_error: 'NEXT_PUBLIC_SUPABASE_URL is required (Supabase project URL).' })
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL.'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ required_error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required.' })
    .min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short to be a real key.'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ required_error: 'SUPABASE_SERVICE_ROLE_KEY is required (server-only, bypasses RLS).' })
    .min(20, 'SUPABASE_SERVICE_ROLE_KEY looks too short to be a real key.'),

  // Site
  NEXT_PUBLIC_SITE_URL: z
    .string({ required_error: 'NEXT_PUBLIC_SITE_URL is required — used in every email link and payment return URL.' })
    .url('NEXT_PUBLIC_SITE_URL must be a valid URL (no trailing slash).'),

  // Email — optional (falls back to the console dev adapter).
  RESEND_API_KEY: z.string().min(10).optional(),
  EMAIL_FROM: z.string().optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().email().optional(),

  // Payments — optional (falls back to the dev simulator).
  PAYMENT_PROVIDER: z.enum(['dev', 'payfast', 'peach', 'yoco']).default('dev'),
  PAYFAST_MERCHANT_ID: z.string().optional(),
  PAYFAST_MERCHANT_KEY: z.string().optional(),
  PAYFAST_PASSPHRASE: z.string().optional(),
  PAYFAST_MODE: z.enum(['sandbox', 'live']).optional(),

  // Cron protection
  CRON_SECRET: z.string().min(16, 'CRON_SECRET should be a long random value (openssl rand -hex 32).').optional(),

  // Admin session
  ADMIN_SESSION_IDLE_MINUTES: z.coerce.number().int().positive().optional(),
});

export type Env = z.infer<typeof envSchema>;

let validated: Env | null = null;

/**
 * Validates process.env once and caches the result. Throws a single error
 * listing every problem found if a required variable is missing/invalid;
 * logs (but doesn't throw for) problems with optional/conditional ones.
 */
export function validateEnv(): Env {
  if (validated) return validated;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid or missing environment variables:\n${issues}\n\nSee .env.example for the full list.`);
  }

  const env = result.data;

  if (env.PAYMENT_PROVIDER === 'payfast') {
    const missing = ['PAYFAST_MERCHANT_ID', 'PAYFAST_MERCHANT_KEY', 'PAYFAST_PASSPHRASE'].filter(
      (k) => !env[k as keyof Env],
    );
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `PAYMENT_PROVIDER=payfast but missing: ${missing.join(', ')}. PayFast checkout will fail until these are set.`,
      );
    }
  }

  if (!env.RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn('RESEND_API_KEY not set — emails will be logged to the console instead of actually sent.');
  }

  if (!env.CRON_SECRET) {
    // eslint-disable-next-line no-console
    console.warn('CRON_SECRET not set — /api/cron/* routes will reject all requests until it is set.');
  }

  validated = env;
  return env;
}

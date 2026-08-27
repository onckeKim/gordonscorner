import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * SECURITY: import 'server-only' guarantees a build-time failure if this
 * module is ever pulled into client-side code. Use this client exclusively
 * inside API route handlers (`src/app/api/**`) and server-only cron jobs —
 * never in Server Components rendered with a request that could leak the
 * response, and never pass the client itself to the browser.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

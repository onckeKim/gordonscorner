import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Explicit floor under whatever cookie options @supabase/ssr computes —
 * `secure` and `sameSite` are filled in only if the library didn't already
 * set them, so this can never accidentally loosen anything, only guarantee
 * a sane default. `httpOnly` is deliberately left alone: the auth-js
 * browser client reads/refreshes the session via `document.cookie`, so
 * forcing httpOnly here would silently break client-side session refresh,
 * sign-out, and the MFA/password-reset flows that call the browser client
 * directly.
 */
function hardenCookieOptions(options: CookieOptions): CookieOptions {
  return {
    ...options,
    sameSite: options.sameSite ?? 'lax',
    secure: options.secure ?? process.env.NODE_ENV === 'production',
    path: options.path ?? '/',
  };
}

/**
 * Server-side Supabase client bound to the current request's cookies.
 * Respects RLS as the currently signed-in user (used for admin pages).
 * Never use this for public writes — those go through the service-role
 * client in `admin.ts` inside API routes only.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, hardenCookieOptions(options));
            });
          } catch {
            // Called from a Server Component without a mutable response —
            // safe to ignore because middleware refreshes the session.
          }
        },
      },
    },
  );
}

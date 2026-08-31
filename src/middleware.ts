import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Protects every /admin/* route except the public auth pages (login,
 * forgot/reset password). Refreshes the Supabase auth session cookie on
 * each request, enforces multi-factor authentication when the signed-in
 * account has it enabled, and enforces an idle-session timeout — separate
 * from Supabase's own JWT expiry, this signs an admin out after a period
 * of inactivity even if their access/refresh tokens are still technically
 * valid.
 */

const IDLE_TIMEOUT_MINUTES = Number(process.env.ADMIN_SESSION_IDLE_MINUTES ?? 60);
const LAST_SEEN_COOKIE = 'admin_last_seen';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];

/** See the identical helper + rationale in src/lib/supabase/server.ts — httpOnly is deliberately left to the library, not forced. */
function hardenCookieOptions(options: CookieOptions): CookieOptions {
  return {
    ...options,
    sameSite: options.sameSite ?? 'lax',
    secure: options.secure ?? process.env.NODE_ENV === 'production',
    path: options.path ?? '/',
  };
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, hardenCookieOptions(options)),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicAuthPage = PUBLIC_ADMIN_PATHS.includes(request.nextUrl.pathname);

  if (!user) {
    if (isPublicAuthPage) return response;
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (isPublicAuthPage) {
    // Let the login page itself handle an existing aal1-but-aal2-required
    // session (it shows the MFA step) and reset-password's own flow.
    return response;
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const lastSeenRaw = request.cookies.get(LAST_SEEN_COOKIE)?.value;
  const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : null;
  const now = Date.now();

  if (lastSeen && now - lastSeen > IDLE_TIMEOUT_MINUTES * 60 * 1000) {
    await supabase.auth.signOut();
    const redirect = NextResponse.redirect(new URL('/admin/login?expired=1', request.url));
    redirect.cookies.delete(LAST_SEEN_COOKIE);
    return redirect;
  }

  response.cookies.set(LAST_SEEN_COOKIE, String(now), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
  });

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};

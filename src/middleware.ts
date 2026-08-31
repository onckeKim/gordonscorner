import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Two independent jobs:
 *  1. Protects every /admin/* route except the public auth pages (login,
 *     forgot/reset password). Refreshes the Supabase auth session cookie on
 *     each request, enforces multi-factor authentication when the signed-in
 *     account has it enabled, and enforces an idle-session timeout —
 *     separate from Supabase's own JWT expiry, this signs an admin out
 *     after a period of inactivity even if their access/refresh tokens are
 *     still technically valid.
 *  2. Checks every *public* request against the admin-managed `redirects`
 *     table (see /admin/seo) before it reaches routing, so a moved/renamed
 *     page never becomes a dead link. See lookupRedirect() below for the
 *     caching tradeoff this makes.
 */

const IDLE_TIMEOUT_MINUTES = Number(process.env.ADMIN_SESSION_IDLE_MINUTES ?? 60);
const LAST_SEEN_COOKIE = 'admin_last_seen';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];

interface RedirectRule {
  from_path: string;
  to_path: string;
  status_code: number;
}

// Module-level cache, best-effort: edge runtimes may or may not reuse this
// across requests, but when they do it turns "one DB read per request" into
// "one DB read per minute of site traffic" — redirects change rarely, so a
// short staleness window is a good trade for not adding a DB round-trip to
// every single public page load.
let redirectsCache: { rules: RedirectRule[]; fetchedAt: number } | null = null;
const REDIRECTS_CACHE_TTL_MS = 60_000;

export async function lookupRedirect(pathname: string): Promise<RedirectRule | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null; // Env not configured (e.g. this build/dev sandbox) — never block routing over it.

  if (!redirectsCache || Date.now() - redirectsCache.fetchedAt > REDIRECTS_CACHE_TTL_MS) {
    try {
      const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data } = await db.from('redirects').select('from_path, to_path, status_code');
      redirectsCache = { rules: data ?? [], fetchedAt: Date.now() };
    } catch {
      // Fails open — a redirect lookup must never take down routing.
      redirectsCache = { rules: redirectsCache?.rules ?? [], fetchedAt: Date.now() };
    }
  }

  return redirectsCache.rules.find((r) => r.from_path === pathname) ?? null;
}

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
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith('/admin')) {
    const redirect = await lookupRedirect(pathname);
    if (redirect) {
      // to_path may be a full external URL (e.g. moving a page off-site) or a site-relative path.
      const destination = /^https?:\/\//.test(redirect.to_path) ? redirect.to_path : new URL(redirect.to_path, request.url);
      return NextResponse.redirect(destination, redirect.status_code);
    }
    return NextResponse.next();
  }

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
  // Runs on every route except static assets, image optimization, and the
  // generated favicon/OG-image/robots/sitemap special files — public pages
  // now need this too (redirect lookups), not just /admin/*.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|opengraph-image|robots.txt|sitemap.xml).*)'],
};

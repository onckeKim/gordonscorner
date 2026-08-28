import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getLockoutStatus, recordLoginAttempt, LOCKOUT_WINDOW_MINUTES } from '@/lib/auth/lockout';
import { handleApiError } from '@/lib/api-response';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function clientIp(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

/**
 * Server-side login so repeated-failed-sign-in lockout can be enforced
 * before Supabase's auth endpoint is ever called, and every attempt
 * (success or failure) is recorded regardless of what the client does.
 * Sets the session cookie itself via the cookie-bound server client — the
 * browser only needs to redirect afterwards.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = loginSchema.parse(await request.json());
    const ip = clientIp(request);

    const lockout = await getLockoutStatus(email);
    if (lockout.locked) {
      return NextResponse.json(
        {
          error: `Too many failed sign-in attempts. Try again after ${new Date(lockout.lockedUntil!).toLocaleTimeString('en-ZA')} (lockouts last ${LOCKOUT_WINDOW_MINUTES} minutes).`,
        },
        { status: 429 },
      );
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      await recordLoginAttempt(email, false, ip);
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    await recordLoginAttempt(email, true, ip);

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp.find((f) => f.status === 'verified');
      return NextResponse.json({ ok: true, mfaRequired: true, factorId: totpFactor?.id ?? null });
    }

    return NextResponse.json({ ok: true, mfaRequired: false });
  } catch (err) {
    return handleApiError(err);
  }
}

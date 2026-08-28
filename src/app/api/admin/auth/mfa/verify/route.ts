import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/api-response';

const verifySchema = z.object({
  factorId: z.string().min(1),
  code: z.string().trim().length(6),
});

/**
 * Completes the TOTP challenge for the session already established by
 * /api/admin/auth/login (currently at aal1). On success this elevates the
 * cookie-bound session to aal2, which is what requireAdmin() checks for.
 */
export async function POST(request: NextRequest) {
  try {
    const { factorId, code } = verifySchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      return NextResponse.json({ error: challengeError?.message ?? 'Could not start MFA challenge.' }, { status: 400 });
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

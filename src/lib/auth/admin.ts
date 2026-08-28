import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ProfileRole } from '@/types/database';

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export interface AdminUser {
  id: string;
  email: string;
  role: ProfileRole;
}

/**
 * Verifies the current request comes from a signed-in admin (a Supabase
 * auth user with a matching row in `profiles`) who has completed any
 * multi-factor challenge their account requires. Throws UnauthorizedError
 * otherwise — API routes should catch this and return 401/403.
 *
 * MFA check: if the user has a verified TOTP factor enrolled,
 * getAuthenticatorAssuranceLevel() reports nextLevel 'aal2'. A session that
 * hasn't completed the MFA challenge yet is still only 'aal1' — reject it,
 * so a stolen aal1 session cookie can't reach admin data once MFA is on.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError('Not signed in.');
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    throw new UnauthorizedError('Multi-factor authentication required.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    throw new UnauthorizedError('Not an admin.');
  }

  return { id: profile.id, email: profile.email, role: profile.role };
}

/**
 * Like requireAdmin(), but also requires a specific role — use for
 * sensitive actions (settings, content, team/role management, refunds,
 * audit log). Throws ForbiddenError (distinct from UnauthorizedError) when
 * a signed-in, otherwise-valid admin simply lacks the required role, so API
 * routes can return 403 rather than 401.
 */
export async function requireRole(role: ProfileRole): Promise<AdminUser> {
  const admin = await requireAdmin();
  if (admin.role !== role) {
    throw new ForbiddenError(`This action requires the ${role} role.`);
  }
  return admin;
}

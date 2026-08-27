import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export class UnauthorizedError extends Error {}

/**
 * Verifies the current request comes from a signed-in admin (a Supabase
 * auth user with a matching row in `profiles`). Throws UnauthorizedError
 * otherwise — API routes should catch this and return 401/403.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError('Not signed in.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('id', user.id)
    .single();

  if (!profile) {
    throw new UnauthorizedError('Not an admin.');
  }

  return { id: profile.id, email: profile.email };
}

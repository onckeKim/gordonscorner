'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const expiredNotice = searchParams.get('expired') === '1';

  // Handles the case where a signed-in session already exists at aal1 but
  // the account has MFA enabled (nextLevel aal2) — e.g. middleware sent the
  // browser here because the session can't reach protected pages yet.
  // Jump straight to the MFA step instead of asking for the password again.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp.find((f) => f.status === 'verified');
        if (totpFactor) setFactorId(totpFactor.id);
      }
      setCheckingSession(false);
    })();
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not sign in.');
        return;
      }

      if (data.mfaRequired && data.factorId) {
        setFactorId(data.factorId);
        return;
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId, code: mfaCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Incorrect code.');
        return;
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-corner-bg px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo />
          <p className="mt-2 text-sm text-corner-muted">Admin sign in</p>
        </div>

        {expiredNotice && !factorId && (
          <p className="mb-4 rounded-lg bg-corner-ivory p-3 text-center text-xs text-corner-muted">
            Your session expired due to inactivity. Please sign in again.
          </p>
        )}

        {checkingSession ? null : !factorId ? (
          <form onSubmit={handlePasswordSubmit} className="card space-y-4">
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-corner-danger">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-center text-xs">
              <a href="/admin/forgot-password" className="text-corner-gold hover:underline">
                Forgot your password?
              </a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleMfaSubmit} className="card space-y-4">
            <p className="text-sm text-corner-muted">
              Enter the 6-digit code from your authenticator app.
            </p>
            <div>
              <label className="label" htmlFor="mfaCode">
                Authentication code
              </label>
              <input
                id="mfaCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                className="input tracking-[0.3em] text-center"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            {error && <p className="text-sm text-corner-danger">{error}</p>}
            <button type="submit" disabled={submitting || mfaCode.length !== 6} className="btn-primary w-full">
              {submitting ? 'Verifying…' : 'Verify & sign in'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-corner-muted">
          Admin accounts are created in the Supabase dashboard — see README.md.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });

    setSubmitting(false);
    // Always show the same confirmation, whether or not the email exists —
    // don't let this endpoint be used to enumerate admin accounts.
    if (resetError) {
      console.error(resetError);
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-corner-bg px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo />
          <p className="mt-2 text-sm text-corner-muted">Reset your password</p>
        </div>

        {sent ? (
          <div className="card space-y-3 text-center">
            <p className="text-sm">
              If an account exists for <strong>{email}</strong>, a password reset link has been
              sent. Check your inbox.
            </p>
            <a href="/admin/login" className="text-xs text-corner-gold hover:underline">
              Back to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
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
            {error && <p className="text-sm text-corner-danger">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-xs">
              <a href="/admin/login" className="text-corner-gold hover:underline">
                Back to sign in
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

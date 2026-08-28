'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Factor {
  id: string;
  friendly_name?: string | null;
  status: string;
}

export function MfaEnrollment() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshFactors() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp.filter((f) => f.status === 'verified') ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refreshFactors();
  }, []);

  async function startEnrollment() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Authenticator ${new Date().toLocaleDateString('en-ZA')}`,
    });
    setBusy(false);

    if (enrollError || !data) {
      setError(enrollError?.message ?? 'Could not start enrollment.');
      return;
    }

    setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verifyEnrollment(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setError(null);
    setBusy(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolling.factorId,
      code,
    });

    setBusy(false);

    if (verifyError) {
      setError('Incorrect code — please try again.');
      return;
    }

    setEnrolling(null);
    setCode('');
    await refreshFactors();
  }

  async function removeFactor(factorId: string) {
    if (!confirm('Remove this authenticator? You will only need your password to sign in.')) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    await refreshFactors();
  }

  if (loading) {
    return <p className="mt-4 text-sm text-corner-muted">Loading…</p>;
  }

  return (
    <div className="mt-4">
      {factors.length > 0 && (
        <ul className="space-y-2">
          {factors.map((f) => (
            <li key={f.id} className="flex items-center justify-between rounded-lg border border-corner-stone p-3 text-sm">
              <span>{f.friendly_name ?? 'Authenticator app'} — enabled</span>
              <button type="button" disabled={busy} onClick={() => removeFactor(f.id)} className="text-xs text-corner-error hover:underline">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {factors.length === 0 && !enrolling && (
        <button type="button" disabled={busy} onClick={startEnrollment} className="btn-secondary mt-2 text-sm">
          {busy ? 'Starting…' : 'Enable two-factor authentication'}
        </button>
      )}

      {enrolling && (
        <form onSubmit={verifyEnrollment} className="mt-4 space-y-3 rounded-lg border border-corner-stone p-4">
          <p className="text-sm">Scan this QR code with your authenticator app (e.g. Google Authenticator, 1Password):</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolling.qrCode} alt="Scan with your authenticator app" className="mx-auto h-40 w-40" />
          <p className="text-center text-xs text-corner-muted">
            Can&rsquo;t scan? Enter this code manually: <code className="font-mono">{enrolling.secret}</code>
          </p>
          <div>
            <label className="label" htmlFor="mfaSetupCode">Enter the 6-digit code to confirm</label>
            <input
              id="mfaSetupCode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              className="input text-center tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          {error && <p className="text-sm text-corner-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={busy || code.length !== 6} className="btn-primary flex-1">
              {busy ? 'Verifying…' : 'Confirm & enable'}
            </button>
            <button type="button" onClick={() => setEnrolling(null)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && !enrolling && <p className="mt-2 text-sm text-corner-danger">{error}</p>}
    </div>
  );
}

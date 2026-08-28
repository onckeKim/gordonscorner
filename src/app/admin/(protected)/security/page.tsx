import { requireAdmin } from '@/lib/auth/admin';
import { MfaEnrollment } from '@/components/admin/MfaEnrollment';

export default async function AdminSecurityPage() {
  const admin = await requireAdmin();

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-semibold">Security</h1>
      <p className="mt-2 text-sm text-corner-muted">
        Signed in as {admin.email} ({admin.role}).
      </p>

      <div className="card mt-6">
        <h2 className="font-display text-lg font-semibold">Two-factor authentication</h2>
        <p className="mt-1 text-sm text-corner-muted">
          Optional, but recommended — once enabled, a 6-digit authenticator app code is required
          in addition to your password every time you sign in.
        </p>
        <MfaEnrollment />
      </div>

      <div className="card mt-6">
        <h2 className="font-display text-lg font-semibold">Password</h2>
        <p className="mt-1 text-sm text-corner-muted">
          Use the <a href="/admin/forgot-password" className="text-corner-gold hover:underline">forgot password</a> flow to change your password — it emails you a secure reset link.
        </p>
      </div>
    </div>
  );
}

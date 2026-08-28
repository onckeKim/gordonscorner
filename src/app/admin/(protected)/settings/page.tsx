import { requireRole } from '@/lib/auth/admin';
import { getSettings } from '@/lib/settings';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { TeamPanel } from '@/components/admin/TeamPanel';

export default async function AdminSettingsPage() {
  const admin = await requireRole('admin');
  const settings = await getSettings();

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold">Settings</h1>
      <p className="mt-2 text-sm text-corner-muted">
        These control the live booking engine — pricing, deposit split, stay rules and deadlines.
        Every change is written to the <a href="/admin/audit-log" className="text-corner-gold hover:underline">audit log</a>.
      </p>

      <div className="mt-6">
        <SettingsForm settings={settings} />
      </div>

      <div className="mt-6">
        <TeamPanel currentUserId={admin.id} />
      </div>
    </div>
  );
}

import { requireRole } from '@/lib/auth/admin';
import { getSettings } from '@/lib/settings';
import { listPageSeoOverrides, listRedirects } from '@/lib/seo/store';
import { SeoSettingsForm } from '@/components/admin/SeoSettingsForm';
import { PageSeoOverridesPanel } from '@/components/admin/PageSeoOverridesPanel';
import { RedirectsPanel } from '@/components/admin/RedirectsPanel';

export default async function AdminSeoPage() {
  await requireRole('admin');
  const [settings, overrides, redirects] = await Promise.all([getSettings(), listPageSeoOverrides(), listRedirects()]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold">SEO</h1>
      <p className="mt-2 text-sm text-corner-muted">
        Tracking scripts, search-console verification, local-SEO fields, per-page metadata
        overrides, and redirects. Blog SEO fields live on each post at{' '}
        <a href="/admin/blog" className="text-corner-gold hover:underline">
          /admin/blog
        </a>
        . Every change here is written to the{' '}
        <a href="/admin/audit-log" className="text-corner-gold hover:underline">
          audit log
        </a>
        .
      </p>

      <div className="mt-6">
        <SeoSettingsForm settings={settings} />
      </div>

      <div className="mt-6">
        <PageSeoOverridesPanel overrides={overrides} />
      </div>

      <div className="mt-6">
        <RedirectsPanel redirects={redirects} />
      </div>
    </div>
  );
}

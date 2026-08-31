import { requireAdmin } from '@/lib/auth/admin';
import { getSettings } from '@/lib/settings';
import { getFunnelSummary } from '@/lib/analytics/dashboard';

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-corner-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-corner-muted">{hint}</p>}
    </div>
  );
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const settings = await getSettings();
  const [last30, allTime] = await Promise.all([getFunnelSummary(daysAgoIso(30)), getFunnelSummary()]);

  const hasThirdParty = Boolean(settings.ga4_measurement_id || settings.gtm_container_id || settings.clarity_project_id);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-semibold">Analytics</h1>
      <p className="mt-2 text-sm text-corner-muted">
        Real numbers from this site&rsquo;s own booking funnel — logged server-side at the moment
        each step actually happens, so nothing here depends on a third-party account being
        configured.{' '}
        {!hasThirdParty && (
          <>
            Want pageview/session-level analytics too? Add a GA4, GTM, or Clarity ID at{' '}
            <a href="/admin/seo" className="text-corner-gold hover:underline">
              /admin/seo
            </a>
            .
          </>
        )}
      </p>

      <h2 className="mt-8 font-display text-lg font-semibold">Last 30 days</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Contact messages" value={last30.contactFormSubmitted} />
        <StatCard label="Booking requests" value={last30.bookingRequested} />
        <StatCard label="Deposits paid" value={last30.depositPaid} />
        <StatCard label="Balances paid" value={last30.balancePaid} />
        <StatCard label="Bookings confirmed" value={last30.bookingConfirmed} />
        <StatCard
          label="Request → deposit rate"
          value={last30.requestToDepositRate != null ? `${last30.requestToDepositRate}%` : '—'}
          hint="Of booking requests, the share that went on to pay a deposit"
        />
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold">All time</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Contact messages" value={allTime.contactFormSubmitted} />
        <StatCard label="Booking requests" value={allTime.bookingRequested} />
        <StatCard label="Deposits paid" value={allTime.depositPaid} />
        <StatCard label="Balances paid" value={allTime.balancePaid} />
        <StatCard label="Bookings confirmed" value={allTime.bookingConfirmed} />
        <StatCard
          label="Request → deposit rate"
          value={allTime.requestToDepositRate != null ? `${allTime.requestToDepositRate}%` : '—'}
        />
      </div>
    </div>
  );
}

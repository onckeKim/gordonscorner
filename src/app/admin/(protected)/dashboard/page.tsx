import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/StatusBadge';
import { getSettings } from '@/lib/settings';
import { todayIsoInPropertyTimeZone } from '@/lib/timezone';
import { addDaysIso, daysBetweenIso } from '@/lib/date-utils';
import type { Booking, Payment } from '@/types/database';

function formatZar(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function StatCard({ label, value, href, hint }: { label: string; value: string | number; href?: string; hint?: string }) {
  const content = (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-corner-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-corner-muted">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:-translate-y-0.5">
      {content}
    </Link>
  ) : (
    content
  );
}

/** Nights of `booking` that overlap [rangeStart, rangeEnd). */
function overlapNights(booking: Pick<Booking, 'check_in' | 'check_out'>, rangeStart: string, rangeEnd: string): number {
  const start = booking.check_in > rangeStart ? booking.check_in : rangeStart;
  const end = booking.check_out < rangeEnd ? booking.check_out : rangeEnd;
  return Math.max(0, daysBetweenIso(start, end));
}

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const settings = await getSettings();
  const today = todayIsoInPropertyTimeZone(settings.time_zone);
  const in7Days = addDaysIso(today, 7);
  const in14Days = addDaysIso(today, 14);
  const in30Days = addDaysIso(today, 30);
  const currency = settings.currency;

  const [{ data: bookings }, { data: recentPayments }] = await Promise.all([
    supabase.from('bookings').select('*').order('check_in', { ascending: true }),
    supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(6),
  ]);

  const all = bookings ?? [];

  const newRequests = all.filter((b) => b.status === 'submitted');
  const awaitingReview = all.filter((b) =>
    ['under_review', 'information_required', 'alternative_dates_proposed'].includes(b.status),
  );
  const awaitingDeposit = all.filter((b) => ['accepted_awaiting_deposit', 'deposit_processing'].includes(b.status));
  const confirmedBookings = all.filter((b) => ['confirmed', 'checked_in', 'checked_out'].includes(b.status));
  const upcomingCheckIns = all.filter((b) => b.status === 'confirmed' && b.check_in >= today && b.check_in <= in7Days);
  const upcomingCheckOuts = all.filter((b) => b.status === 'checked_in' && b.check_out >= today && b.check_out <= in7Days);
  const outstandingBalances = all.filter(
    (b) => ['confirmed', 'checked_in', 'checked_out'].includes(b.status) && !b.balance_paid_at && b.balance_amount > 0,
  );
  const expiredHoldsPendingSweep = all.filter(
    (b) => b.status === 'accepted_awaiting_deposit' && b.hold_expires_at && b.hold_expires_at < new Date().toISOString(),
  );
  const expiredLinks = all.filter((b) => b.status === 'expired');
  const cancelledBookings = all.filter((b) => b.status === 'cancelled');

  const occupiedNights = confirmedBookings.reduce((sum, b) => sum + overlapNights(b, today, in30Days), 0);
  const occupancyPercent = Math.round((occupiedNights / 30) * 100);

  const totalConfirmedRevenue = confirmedBookings.reduce((sum, b) => sum + b.total_amount, 0);
  const totalOutstanding = outstandingBalances.reduce((sum, b) => sum + b.balance_amount, 0);

  const thisMonth = today.slice(0, 7);
  const { data: allPaidPayments } = await supabase
    .from('payments')
    .select('amount, paid_at, created_at, status')
    .eq('status', 'paid');
  const revenueThisMonth = (allPaidPayments ?? [])
    .filter((p) => (p.paid_at ?? p.created_at).slice(0, 7) === thisMonth)
    .reduce((sum, p) => sum + p.amount, 0);

  const bookingById = new Map(all.map((b) => [b.id, b]));

  const calendarStrip: { date: string; bookings: Booking[] }[] = [];
  for (let cursor = today; cursor < in14Days; cursor = addDaysIso(cursor, 1)) {
    calendarStrip.push({
      date: cursor,
      bookings: all.filter(
        (b) =>
          ['accepted_awaiting_deposit', 'deposit_processing', 'confirmed', 'checked_in', 'checked_out'].includes(
            b.status,
          ) &&
          cursor >= b.check_in &&
          cursor < b.check_out,
      ),
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        <Link href="/admin/bookings" className="text-sm text-corner-gold hover:underline">
          View all bookings &rarr;
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="New requests" value={newRequests.length} href="/admin/bookings?status=submitted" />
        <StatCard label="Awaiting review" value={awaitingReview.length} href="/admin/bookings?status=under_review" />
        <StatCard label="Awaiting deposit" value={awaitingDeposit.length} href="/admin/bookings?status=accepted_awaiting_deposit" />
        <StatCard label="Confirmed" value={confirmedBookings.length} href="/admin/bookings?status=confirmed" />
        <StatCard label="Upcoming check-ins (7d)" value={upcomingCheckIns.length} href="/admin/calendar" />
        <StatCard label="Upcoming check-outs (7d)" value={upcomingCheckOuts.length} href="/admin/calendar" />
        <StatCard
          label="Outstanding balances"
          value={formatZar(totalOutstanding, currency)}
          hint={`${outstandingBalances.length} booking${outstandingBalances.length === 1 ? '' : 's'}`}
          href="/admin/bookings?status=confirmed"
        />
        <StatCard
          label="Expired payment links"
          value={expiredLinks.length + expiredHoldsPendingSweep.length}
          hint={expiredHoldsPendingSweep.length > 0 ? `${expiredHoldsPendingSweep.length} pending cleanup` : undefined}
          href="/admin/bookings?status=expired"
        />
        <StatCard label="Cancelled" value={cancelledBookings.length} href="/admin/bookings?status=cancelled" />
        <StatCard label="Occupancy (next 30d)" value={`${occupancyPercent}%`} hint={`${occupiedNights} of 30 nights`} />
        <StatCard label="Confirmed revenue (all time)" value={formatZar(totalConfirmedRevenue, currency)} />
        <StatCard label="Revenue received this month" value={formatZar(revenueThisMonth, currency)} href="/admin/payments" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr,1fr]">
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Next 14 days</h2>
            <Link href="/admin/calendar" className="text-xs text-corner-gold hover:underline">
              Full calendar &rarr;
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-xs">
            {calendarStrip.map((day) => {
              const hasConfirmed = day.bookings.some((b) => ['confirmed', 'checked_in', 'checked_out'].includes(b.status));
              const hasHeld = day.bookings.some((b) => ['accepted_awaiting_deposit', 'deposit_processing'].includes(b.status));
              return (
                <div
                  key={day.date}
                  title={day.bookings.map((b) => b.guest_name).join(', ') || 'Available'}
                  className={`rounded-md py-2 ${
                    hasConfirmed
                      ? 'bg-corner-forest/80 text-white'
                      : hasHeld
                        ? 'bg-corner-gold/30 text-corner-charcoal'
                        : 'bg-corner-ivory text-corner-muted'
                  }`}
                >
                  <p className="font-medium">{formatDate(day.date).slice(0, 6)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-corner-muted">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-corner-forest/80" /> Confirmed</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-corner-gold/30" /> Held</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-corner-ivory" /> Available</span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent payments</h2>
            <Link href="/admin/payments" className="text-xs text-corner-gold hover:underline">
              All payments &rarr;
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {(recentPayments ?? []).map((p: Payment) => {
              const booking = bookingById.get(p.booking_id);
              return (
                <li key={p.id} className="flex items-center justify-between border-t border-corner-stone pt-2 first:border-t-0 first:pt-0">
                  <div>
                    <Link href={`/admin/bookings/${p.booking_id}`} className="font-medium hover:underline">
                      {booking?.guest_name ?? p.booking_id.slice(0, 8)}
                    </Link>
                    <p className="text-xs capitalize text-corner-muted">
                      {p.type} &middot; {p.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatZar(p.amount, booking?.currency ?? currency)}</p>
                    <p className="text-xs text-corner-muted">{formatDateTime(p.paid_at ?? p.created_at)}</p>
                  </div>
                </li>
              );
            })}
            {(recentPayments ?? []).length === 0 && <p className="text-corner-muted">No payments yet.</p>}
          </ul>
        </div>
      </div>

      {(newRequests.length > 0 || awaitingReview.length > 0) && (
        <div className="card mt-8">
          <h2 className="font-display text-lg font-semibold">Needs your attention</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[...newRequests, ...awaitingReview].slice(0, 8).map((b) => (
              <li key={b.id} className="flex items-center justify-between border-t border-corner-stone pt-2 first:border-t-0 first:pt-0">
                <div>
                  <Link href={`/admin/bookings/${b.id}`} className="font-medium hover:underline">
                    {b.guest_name}
                  </Link>
                  <p className="text-xs text-corner-muted">
                    {formatDate(b.check_in)} &rarr; {formatDate(b.check_out)}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BlockDatesForm } from '@/components/admin/BlockDatesForm';
import { BlockedDatesList } from '@/components/admin/BlockedDatesList';
import { RateOverridesPanel } from '@/components/admin/RateOverridesPanel';
import { ManualBookingForm } from '@/components/admin/ManualBookingForm';
import { StatusBadge } from '@/components/StatusBadge';
import { getSettings, getDateRateOverrides, toPricingInputs } from '@/lib/settings';
import { calculateStayPricing } from '@/lib/pricing';
import { todayIsoInPropertyTimeZone } from '@/lib/timezone';
import { addDaysIso, isoDateWeekday } from '@/lib/date-utils';
import type { Booking, BlockedDateRange } from '@/types/database';

type ViewMode = 'month' | 'week' | 'day';

function formatZar(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(amount);
}

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function monthYearLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function startOfMonthIso(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function addMonthsIso(iso: string, months: number): string {
  const [y, m] = iso.split('-').map(Number);
  const total = (y as number) * 12 + ((m as number) - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function daysInMonth(iso: string): number {
  const [y, m] = iso.split('-').map(Number);
  return new Date(Date.UTC(y as number, m as number, 0)).getUTCDate();
}

function dayCellStatus(date: string, bookings: Booking[], blocked: BlockedDateRange[]) {
  const booking = bookings.find(
    (b) =>
      ['accepted_awaiting_deposit', 'deposit_processing', 'confirmed', 'checked_in', 'checked_out'].includes(b.status) &&
      date >= b.check_in &&
      date < b.check_out,
  );
  if (booking) {
    const confirmed = ['confirmed', 'checked_in', 'checked_out'].includes(booking.status);
    return { kind: confirmed ? ('confirmed' as const) : ('held' as const), booking };
  }
  const block = blocked.find((b) => date >= b.start_date && date < b.end_date);
  if (block) return { kind: 'blocked' as const, block };
  return { kind: 'available' as const };
}

const CELL_STYLES = {
  confirmed: 'bg-corner-forest text-white',
  held: 'bg-corner-gold/40 text-corner-charcoal',
  blocked: 'bg-corner-stone text-corner-charcoal',
  available: 'bg-white text-corner-muted',
};

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const { view: viewParam, date: dateParam } = await searchParams;
  const settings = await getSettings();
  const today = todayIsoInPropertyTimeZone(settings.time_zone);
  const view: ViewMode = viewParam === 'week' || viewParam === 'day' ? viewParam : 'month';
  const anchor = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

  const supabase = await createServerSupabaseClient();
  const [{ data: bookings }, { data: blockedDates }, rateOverrides] = await Promise.all([
    supabase
      .from('bookings')
      .select('*')
      .in('status', ['accepted_awaiting_deposit', 'deposit_processing', 'confirmed', 'checked_in', 'checked_out'])
      .order('check_in', { ascending: true }),
    supabase.from('blocked_dates').select('*').order('start_date', { ascending: true }),
    getDateRateOverrides(),
  ]);

  const allBookings = bookings ?? [];
  const allBlocked = blockedDates ?? [];
  const pricingInputs = toPricingInputs(settings, rateOverrides);

  let gridStart: string;
  let gridEnd: string;
  let title: string;
  let prevHref: string;
  let nextHref: string;

  if (view === 'day') {
    gridStart = anchor;
    gridEnd = addDaysIso(anchor, 1);
    title = dayLabel(anchor);
    prevHref = `/admin/calendar?view=day&date=${addDaysIso(anchor, -1)}`;
    nextHref = `/admin/calendar?view=day&date=${addDaysIso(anchor, 1)}`;
  } else if (view === 'week') {
    const weekday = isoDateWeekday(anchor);
    gridStart = addDaysIso(anchor, -weekday);
    gridEnd = addDaysIso(gridStart, 7);
    title = `${dayLabel(gridStart)} – ${dayLabel(addDaysIso(gridEnd, -1))}`;
    prevHref = `/admin/calendar?view=week&date=${addDaysIso(anchor, -7)}`;
    nextHref = `/admin/calendar?view=week&date=${addDaysIso(anchor, 7)}`;
  } else {
    const monthStart = startOfMonthIso(anchor);
    const leadingWeekday = isoDateWeekday(monthStart);
    gridStart = addDaysIso(monthStart, -leadingWeekday);
    const totalDays = daysInMonth(monthStart);
    const cells = Math.ceil((leadingWeekday + totalDays) / 7) * 7;
    gridEnd = addDaysIso(gridStart, cells);
    title = monthYearLabel(monthStart);
    prevHref = `/admin/calendar?view=month&date=${addMonthsIso(monthStart, -1)}`;
    nextHref = `/admin/calendar?view=month&date=${addMonthsIso(monthStart, 1)}`;
  }

  const days: string[] = [];
  for (let cursor = gridStart; cursor < gridEnd; cursor = addDaysIso(cursor, 1)) {
    days.push(cursor);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.5fr,1fr]">
      <div className="space-y-6">
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-semibold">{title}</h1>
            <div className="flex items-center gap-2">
              <div className="flex overflow-hidden rounded-full border border-corner-border text-xs">
                {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
                  <Link
                    key={v}
                    href={`/admin/calendar?view=${v}&date=${anchor}`}
                    className={`px-3 py-1.5 capitalize ${view === v ? 'bg-corner-ink text-white' : 'bg-white hover:bg-corner-bg'}`}
                  >
                    {v}
                  </Link>
                ))}
              </div>
              <Link href={prevHref} className="rounded-full border border-corner-border px-3 py-1.5 text-xs hover:bg-corner-bg">
                &larr;
              </Link>
              <Link href={`/admin/calendar?view=${view}&date=${today}`} className="rounded-full border border-corner-border px-3 py-1.5 text-xs hover:bg-corner-bg">
                Today
              </Link>
              <Link href={nextHref} className="rounded-full border border-corner-border px-3 py-1.5 text-xs hover:bg-corner-bg">
                &rarr;
              </Link>
            </div>
          </div>

          {view === 'day' ? (
            (() => {
              const cell = dayCellStatus(anchor, allBookings, allBlocked);
              const pricing = calculateStayPricing(anchor, addDaysIso(anchor, 1), pricingInputs);
              const minStayOverride = rateOverrides.find((r) => r.min_nights != null && anchor >= r.start_date && anchor < r.end_date);
              return (
                <div className="mt-4 space-y-3 text-sm">
                  <div className={`rounded-lg p-4 ${CELL_STYLES[cell.kind]}`}>
                    {cell.kind === 'available' && <p>Available &mdash; {formatZar(pricing.nightlyBreakdown[0]?.rateZar ?? 0, settings.currency)}/night</p>}
                    {cell.kind === 'confirmed' && cell.booking && (
                      <p>
                        Confirmed —{' '}
                        <Link href={`/admin/bookings/${cell.booking.id}`} className="underline">
                          {cell.booking.guest_name}
                        </Link>
                      </p>
                    )}
                    {cell.kind === 'held' && cell.booking && (
                      <p>
                        Held —{' '}
                        <Link href={`/admin/bookings/${cell.booking.id}`} className="underline">
                          {cell.booking.guest_name}
                        </Link>
                      </p>
                    )}
                    {cell.kind === 'blocked' && cell.block && <p>Blocked{cell.block.reason ? ` — ${cell.block.reason}` : ''}</p>}
                  </div>
                  <p className="text-corner-muted">
                    Nightly rate: {formatZar(pricing.nightlyBreakdown[0]?.rateZar ?? 0, settings.currency)}
                    {minStayOverride && ` · Minimum stay: ${minStayOverride.min_nights} nights (${minStayOverride.label ?? 'seasonal'})`}
                  </p>
                </div>
              );
            })()
          ) : (
            <div className={`mt-4 grid grid-cols-7 gap-1.5 ${view === 'week' ? 'text-sm' : 'text-xs'}`}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center font-medium text-corner-muted">
                  {d}
                </div>
              ))}
              {days.map((date) => {
                const cell = dayCellStatus(date, allBookings, allBlocked);
                const inMonth = view === 'month' ? date.slice(0, 7) === startOfMonthIso(anchor).slice(0, 7) : true;
                return (
                  <Link
                    key={date}
                    href={`/admin/calendar?view=day&date=${date}`}
                    className={`rounded-md p-1.5 text-center ${CELL_STYLES[cell.kind]} ${inMonth ? '' : 'opacity-40'} ${date === today ? 'ring-2 ring-corner-gold' : ''}`}
                    title={cell.kind === 'blocked' ? cell.block?.reason ?? 'Blocked' : cell.kind === 'available' ? 'Available' : cell.booking?.guest_name}
                  >
                    <p className="font-medium">{Number(date.slice(8, 10))}</p>
                    {view === 'week' && cell.kind !== 'available' && (
                      <p className="truncate text-[11px]">
                        {cell.kind === 'blocked' ? cell.block?.reason ?? 'Blocked' : cell.booking?.guest_name}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-corner-muted">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-corner-forest" /> Confirmed</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-corner-gold/40" /> Held</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-corner-stone" /> Blocked</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border border-corner-border bg-white" /> Available</span>
          </div>
        </div>

        <RateOverridesPanel overrides={rateOverrides} weekendRate={settings.weekend_nightly_rate} currency={settings.currency} />

        <div className="card">
          <h2 className="font-display text-lg font-semibold">Manual blocks</h2>
          <div className="mt-3">
            <BlockedDatesList blockedDates={allBlocked} />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <ManualBookingForm />
        <BlockDatesForm />
        <div className="card">
          <h2 className="font-display text-lg font-semibold">Upcoming &amp; held dates</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {allBookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between border-t border-corner-border pt-2 first:border-t-0 first:pt-0">
                <div>
                  <Link href={`/admin/bookings/${b.id}`} className="font-medium hover:underline">
                    {b.guest_name}
                  </Link>
                  <p className="text-corner-muted">
                    {b.check_in} &rarr; {b.check_out}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
            {allBookings.length === 0 && <p className="text-corner-muted">No held or confirmed dates right now.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { bookingRules } from '@/lib/config';
import { isWithinLeadTime, leadTimeDescription } from '@/lib/timezone';

export interface DateRange {
  checkIn: Date | null;
  checkOut: Date | null;
}

type AvailabilityStatus = 'held' | 'confirmed' | 'blocked';

interface UnavailableRange {
  start_date: string;
  end_date: string;
  status: AvailabilityStatus;
}

interface CalendarProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function toIso(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function dayKey(date: Date): string {
  return toIso(date);
}

function statusForDate(date: Date, ranges: UnavailableRange[]): AvailabilityStatus | null {
  const iso = toIso(date);
  const match = ranges.find((r) => iso >= r.start_date && iso < r.end_date);
  return match?.status ?? null;
}

function hasOverlap(start: Date, end: Date, ranges: UnavailableRange[]): boolean {
  const s = toIso(start);
  const e = toIso(end);
  return ranges.some((r) => s < r.end_date && r.start_date < e);
}

const STATUS_LEGEND: { status: AvailabilityStatus; label: string; swatchClass: string }[] = [
  { status: 'held', label: 'Temporarily held', swatchClass: 'bg-corner-warning/25' },
  { status: 'confirmed', label: 'Confirmed (unavailable)', swatchClass: 'bg-corner-error/20' },
  { status: 'blocked', label: 'Blocked by host', swatchClass: 'bg-corner-stone' },
];

const STATUS_DAY_CLASSES: Record<AvailabilityStatus, string> = {
  held: 'cursor-not-allowed bg-corner-warning/10 text-corner-warning line-through',
  confirmed: 'cursor-not-allowed bg-corner-error/10 text-corner-error line-through',
  blocked: 'cursor-not-allowed bg-corner-stone text-corner-muted line-through',
};

export function Calendar({ value, onChange }: CalendarProps) {
  const [ranges, setRanges] = useState<UnavailableRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date()));
  const [hint, setHint] = useState<string | null>(null);
  const [activeDate, setActiveDateState] = useState(() => value.checkIn ?? new Date());
  const dayRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingFocusKey = useRef<string | null>(null);

  useEffect(() => {
    fetch('/api/availability')
      .then((res) => res.json())
      .then((data) => setRanges(data.ranges ?? []))
      .catch(() => setError('Could not load availability. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (pendingFocusKey.current) {
      dayRefs.current.get(pendingFocusKey.current)?.focus();
      pendingFocusKey.current = null;
    }
  }, [activeDate, visibleMonth]);

  const today = startOfDay(new Date());
  const secondMonth = useMemo(() => addMonths(visibleMonth, 1), [visibleMonth]);

  function isPastOrTooSoon(date: Date): boolean {
    return isBefore(date, today) || !isWithinLeadTime(toIso(date));
  }

  function isUnavailable(date: Date): boolean {
    return isPastOrTooSoon(date) || statusForDate(date, ranges) !== null;
  }

  /** Moves the roving-tabindex focus to `date`, shifting the visible months if needed. */
  function setActiveDate(date: Date, focus = true) {
    setActiveDateState(date);
    if (isBefore(date, visibleMonth)) {
      setVisibleMonth(startOfMonth(date));
    } else if (!isSameMonth(date, visibleMonth) && !isSameMonth(date, secondMonth)) {
      setVisibleMonth(startOfMonth(subMonths(date, 1)));
    }
    if (focus) {
      pendingFocusKey.current = dayKey(date);
    }
  }

  function selectDate(date: Date) {
    if (isUnavailable(date)) return;
    setHint(null);

    const { checkIn, checkOut } = value;

    if (!checkIn || checkOut) {
      onChange({ checkIn: date, checkOut: null });
      return;
    }

    if (isBefore(date, checkIn) || isSameDay(date, checkIn)) {
      onChange({ checkIn: date, checkOut: null });
      return;
    }

    const nights = Math.round((date.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    if (nights < bookingRules.minNights) {
      setHint(`Minimum stay is ${bookingRules.minNights} nights — choose a later check-out date.`);
      return;
    }
    if (nights > bookingRules.maxNights) {
      setHint(`Maximum stay is ${bookingRules.maxNights} nights.`);
      return;
    }

    if (hasOverlap(checkIn, date, ranges)) {
      setHint('Those dates include an unavailable night. Please choose a different range.');
      return;
    }

    onChange({ checkIn, checkOut: date });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, date: Date) {
    const keyMoves: Record<string, () => Date | null> = {
      ArrowLeft: () => addDays(date, -1),
      ArrowRight: () => addDays(date, 1),
      ArrowUp: () => addDays(date, -7),
      ArrowDown: () => addDays(date, 7),
      Home: () => startOfWeek(date, { weekStartsOn: 1 }),
      End: () => endOfWeek(date, { weekStartsOn: 1 }),
      PageUp: () => subMonths(date, 1),
      PageDown: () => addMonths(date, 1),
    };

    const move = keyMoves[e.key];
    if (move) {
      e.preventDefault();
      const next = move();
      if (next) setActiveDate(next);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectDate(date);
    }
  }

  function dayLabel(date: Date): string {
    const base = format(date, 'EEEE, d MMMM yyyy');
    const status = statusForDate(date, ranges);
    if (status === 'held') return `${base}, temporarily held`;
    if (status === 'confirmed') return `${base}, confirmed, unavailable`;
    if (status === 'blocked') return `${base}, blocked by host`;
    if (!isBefore(date, today) && !isWithinLeadTime(toIso(date))) {
      return `${base}, too soon to book — bookings need ${leadTimeDescription()}`;
    }
    if (isBefore(date, today)) return `${base}, in the past`;
    if (value.checkIn && isSameDay(date, value.checkIn)) return `${base}, selected as check-in`;
    if (value.checkOut && isSameDay(date, value.checkOut)) return `${base}, selected as check-out`;
    return `${base}, available`;
  }

  function renderMonth(monthStart: Date) {
    const monthEnd = endOfMonth(monthStart);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    return (
      <div>
        <p className="mb-3 text-center font-display text-lg font-semibold text-corner-charcoal">
          {format(monthStart, 'MMMM yyyy')}
        </p>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase text-corner-muted" aria-hidden>
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = isSameMonth(day, monthStart);
            const status = statusForDate(day, ranges);
            const pastOrTooSoon = isPastOrTooSoon(day);
            const unavailableDay = pastOrTooSoon || status !== null;
            const isCheckIn = value.checkIn && isSameDay(day, value.checkIn);
            const isCheckOut = value.checkOut && isSameDay(day, value.checkOut);
            const inRange =
              value.checkIn && value.checkOut && day > value.checkIn && day < value.checkOut;
            const isActive = isSameDay(day, activeDate);

            if (!inMonth) {
              return <div key={day.toISOString()} aria-hidden className="aspect-square" />;
            }

            return (
              <button
                key={day.toISOString()}
                ref={(el) => {
                  if (el) dayRefs.current.set(dayKey(day), el);
                  else dayRefs.current.delete(dayKey(day));
                }}
                type="button"
                tabIndex={isActive ? 0 : -1}
                aria-disabled={unavailableDay || undefined}
                aria-current={isToday(day) ? 'date' : undefined}
                aria-label={dayLabel(day)}
                onFocus={() => setActiveDateState(day)}
                onClick={() => selectDate(day)}
                onKeyDown={(e) => handleKeyDown(e, day)}
                className={[
                  'aspect-square rounded-md text-sm transition-colors motion-reduce:transition-none',
                  status
                    ? STATUS_DAY_CLASSES[status]
                    : pastOrTooSoon
                      ? 'cursor-not-allowed text-corner-muted/40 line-through'
                      : 'hover:bg-corner-gold/10',
                  isCheckIn || isCheckOut ? 'bg-corner-gold text-white hover:bg-corner-gold' : '',
                  inRange ? 'bg-corner-gold/15' : '',
                  !unavailableDay && !isCheckIn && !isCheckOut && !inRange ? 'text-corner-charcoal' : '',
                  isToday(day) && !isCheckIn && !isCheckOut ? 'font-semibold underline decoration-corner-gold' : '',
                ].join(' ')}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
          className="rounded-full border border-corner-stone p-2 hover:bg-corner-ivory"
          aria-label="Previous month"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        <span className="text-xs uppercase tracking-wide text-corner-muted">
          Select check-in and check-out
        </span>
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
          className="rounded-full border border-corner-stone p-2 hover:bg-corner-ivory"
          aria-label="Next month"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <p role="status" className="py-10 text-center text-sm text-corner-muted">
          Loading availability&hellip;
        </p>
      ) : error ? (
        <p role="alert" className="py-10 text-center text-sm text-corner-error">
          {error}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {renderMonth(visibleMonth)}
          {renderMonth(secondMonth)}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-corner-stone pt-4 text-xs text-corner-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded-sm border border-corner-stone bg-corner-white" />
          Available
        </span>
        {STATUS_LEGEND.map((item) => (
          <span key={item.status} className="flex items-center gap-1.5">
            <span aria-hidden className={`h-3 w-3 rounded-sm ${item.swatchClass}`} />
            {item.label}
          </span>
        ))}
      </div>

      <p role="status" className={hint ? 'mt-4 text-sm text-corner-warning' : 'sr-only'}>
        {hint}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-corner-stone pt-4 text-sm">
        <div>
          <span className="text-corner-muted">Check-in: </span>
          <strong>{value.checkIn ? format(value.checkIn, 'd MMM yyyy') : '—'}</strong>
        </div>
        <div>
          <span className="text-corner-muted">Check-out: </span>
          <strong>{value.checkOut ? format(value.checkOut, 'd MMM yyyy') : '—'}</strong>
        </div>
        {value.checkIn && value.checkOut && (
          <button
            type="button"
            onClick={() => onChange({ checkIn: null, checkOut: null })}
            className="text-xs text-corner-muted underline hover:text-corner-charcoal"
          >
            Clear dates
          </button>
        )}
      </div>
    </div>
  );
}

export { toIso };

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { bookingRules } from '@/lib/config';

export interface DateRange {
  checkIn: Date | null;
  checkOut: Date | null;
}

interface UnavailableRange {
  start_date: string;
  end_date: string;
}

interface CalendarProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function toIso(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function isWithinAnyRange(date: Date, ranges: UnavailableRange[]): boolean {
  const iso = toIso(date);
  return ranges.some((r) => iso >= r.start_date && iso < r.end_date);
}

function hasOverlap(start: Date, end: Date, ranges: UnavailableRange[]): boolean {
  const s = toIso(start);
  const e = toIso(end);
  return ranges.some((r) => s < r.end_date && r.start_date < e);
}

export function Calendar({ value, onChange }: CalendarProps) {
  const [unavailable, setUnavailable] = useState<UnavailableRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(new Date()));
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/availability')
      .then((res) => res.json())
      .then((data) => setUnavailable(data.ranges ?? []))
      .catch(() => setError('Could not load availability. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const today = startOfDay(new Date());

  function isDisabled(date: Date): boolean {
    return isBefore(date, today) || isWithinAnyRange(date, unavailable);
  }

  function handleDayClick(date: Date) {
    if (isDisabled(date)) return;
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

    if (hasOverlap(checkIn, date, unavailable)) {
      setHint('Those dates include an unavailable night. Please choose a different range.');
      return;
    }

    onChange({ checkIn, checkOut: date });
  }

  function renderMonth(monthStart: Date) {
    const monthEnd = endOfMonth(monthStart);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    return (
      <div>
        <p className="mb-3 text-center font-display text-lg font-semibold">
          {format(monthStart, 'MMMM yyyy')}
        </p>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase text-corner-muted">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = day.getMonth() === monthStart.getMonth();
            const disabled = isDisabled(day);
            const isCheckIn = value.checkIn && isSameDay(day, value.checkIn);
            const isCheckOut = value.checkOut && isSameDay(day, value.checkOut);
            const inRange =
              value.checkIn &&
              value.checkOut &&
              day > value.checkIn &&
              day < value.checkOut;

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={disabled || !inMonth}
                onClick={() => handleDayClick(day)}
                className={[
                  'aspect-square rounded-md text-sm transition-colors',
                  !inMonth ? 'invisible' : '',
                  disabled ? 'cursor-not-allowed text-corner-muted/40 line-through' : 'hover:bg-corner-accent/10',
                  isCheckIn || isCheckOut ? 'bg-corner-accent text-white hover:bg-corner-accent' : '',
                  inRange ? 'bg-corner-accent/15' : '',
                  !disabled && !isCheckIn && !isCheckOut && !inRange ? 'text-corner-ink' : '',
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

  const secondMonth = useMemo(() => addMonths(visibleMonth, 1), [visibleMonth]);

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
          className="rounded-full border border-corner-border px-3 py-1 text-sm hover:bg-corner-bg"
          aria-label="Previous month"
        >
          &larr;
        </button>
        <span className="text-xs uppercase tracking-wide text-corner-muted">
          Select check-in and check-out
        </span>
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
          className="rounded-full border border-corner-border px-3 py-1 text-sm hover:bg-corner-bg"
          aria-label="Next month"
        >
          &rarr;
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-corner-muted">Loading availability&hellip;</p>
      ) : error ? (
        <p className="py-10 text-center text-sm text-corner-danger">{error}</p>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {renderMonth(visibleMonth)}
          {renderMonth(secondMonth)}
        </div>
      )}

      {hint && <p className="mt-4 text-sm text-corner-warn">{hint}</p>}

      <div className="mt-4 flex items-center justify-between border-t border-corner-border pt-4 text-sm">
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
            className="text-xs text-corner-muted underline hover:text-corner-ink"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export { toIso };

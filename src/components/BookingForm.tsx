'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, toIso, type DateRange } from './Calendar';
import { calculateStayTotal, bookingRules } from '@/lib/config';

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

export function BookingForm() {
  const router = useRouter();
  const [range, setRange] = useState<DateRange>({ checkIn: null, checkOut: null });
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestsCount, setGuestsCount] = useState(2);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nights =
    range.checkIn && range.checkOut
      ? Math.round((range.checkOut.getTime() - range.checkIn.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  const pricing = useMemo(() => (nights > 0 ? calculateStayTotal(nights) : null), [nights]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!range.checkIn || !range.checkOut) {
      setError('Please select your check-in and check-out dates.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName,
          guestEmail,
          guestPhone: guestPhone || undefined,
          checkIn: toIso(range.checkIn),
          checkOut: toIso(range.checkOut),
          guestsCount,
          message: message || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Could not submit your request.');
      }

      router.push(`/booking/${data.booking.id}?justSubmitted=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
      <Calendar value={range} onChange={setRange} />

      <div className="card space-y-5">
        <div>
          <h3 className="font-display text-xl font-semibold">Your details</h3>
          <p className="mt-1 text-sm text-corner-muted">
            We&rsquo;ll review your request and reply within 24 hours.
          </p>
        </div>

        {pricing && (
          <div className="rounded-lg bg-corner-bg p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-corner-muted">
                {nights} night{nights === 1 ? '' : 's'}
              </span>
              <span>{formatZar(pricing.totalAmount)}</span>
            </div>
            <div className="mt-1 flex justify-between font-medium">
              <span>Deposit due on approval ({Math.round(bookingRules.depositRate * 100)}%)</span>
              <span>{formatZar(pricing.depositAmount)}</span>
            </div>
            <div className="mt-1 flex justify-between text-corner-muted">
              <span>Balance due later</span>
              <span>{formatZar(pricing.balanceAmount)}</span>
            </div>
          </div>
        )}

        <div>
          <label className="label" htmlFor="guestName">
            Full name
          </label>
          <input
            id="guestName"
            required
            className="input"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="guestEmail">
              Email
            </label>
            <input
              id="guestEmail"
              type="email"
              required
              className="input"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="guestPhone">
              Phone
            </label>
            <input
              id="guestPhone"
              className="input"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="guestsCount">
            Guests
          </label>
          <input
            id="guestsCount"
            type="number"
            min={1}
            max={20}
            required
            className="input"
            value={guestsCount}
            onChange={(e) => setGuestsCount(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="label" htmlFor="message">
            Anything we should know? (optional)
          </label>
          <textarea
            id="message"
            className="input"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-corner-danger">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Sending request…' : 'Request to book'}
        </button>
      </div>
    </form>
  );
}

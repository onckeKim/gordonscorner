'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Minus, Plus } from 'lucide-react';
import { Calendar, toIso, type DateRange } from './Calendar';
import { PriceBreakdown } from './PriceBreakdown';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { calculateStayPricing } from '@/lib/pricing';
import { propertyDetails } from '@/lib/config';

const COMMON_COUNTRIES = [
  'South Africa',
  'United Kingdom',
  'United States',
  'Germany',
  'Netherlands',
  'Namibia',
  'Zimbabwe',
  'Australia',
  'France',
  'Botswana',
];

function GuestCounter({
  label,
  hint,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-corner-charcoal">{label}</p>
        {hint && <p className="text-xs text-corner-muted">{hint}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-corner-stone text-corner-charcoal hover:bg-corner-ivory disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus aria-hidden className="h-4 w-4" />
        </button>
        <span className="w-4 text-center text-sm font-medium" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-corner-stone text-corner-charcoal hover:bg-corner-ivory"
        >
          <Plus aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function BookingForm() {
  const router = useRouter();
  const [range, setRange] = useState<DateRange>({ checkIn: null, checkOut: null });
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCountry, setGuestCountry] = useState('');
  const [adultsCount, setAdultsCount] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);
  const [estimatedArrivalTime, setEstimatedArrivalTime] = useState('');
  const [message, setMessage] = useState('');
  const [bookingPurpose, setBookingPurpose] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [cancellationPolicyAgreed, setCancellationPolicyAgreed] = useState(false);
  const [communicationConsent, setCommunicationConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nights =
    range.checkIn && range.checkOut
      ? Math.round((range.checkOut.getTime() - range.checkIn.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  const pricing = useMemo(
    () => (range.checkIn && range.checkOut && nights > 0 ? calculateStayPricing(toIso(range.checkIn), toIso(range.checkOut)) : null),
    [range.checkIn, range.checkOut, nights],
  );
  const totalGuests = adultsCount + childrenCount;
  const overCapacity = totalGuests > propertyDetails.maxGuests;
  const canSubmit = termsAgreed && cancellationPolicyAgreed;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!range.checkIn || !range.checkOut) {
      setError('Please select your check-in and check-out dates.');
      return;
    }
    if (overCapacity) {
      setError(`This property sleeps a maximum of ${propertyDetails.maxGuests} guests — please reduce your guest count.`);
      return;
    }
    if (!canSubmit) {
      setError('Please accept the booking terms and cancellation policy before requesting to book.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          guestEmail,
          guestPhone,
          guestCountry,
          checkIn: toIso(range.checkIn),
          checkOut: toIso(range.checkOut),
          adultsCount,
          childrenCount,
          estimatedArrivalTime: estimatedArrivalTime || undefined,
          message: message || undefined,
          bookingPurpose: bookingPurpose || undefined,
          termsAgreed,
          cancellationPolicyAgreed,
          communicationConsent,
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
      <div className="space-y-4">
        <Calendar value={range} onChange={setRange} />
        {nights > 0 && (
          <Alert
            variant="success"
            title="Available"
            description={`These dates are available for a ${nights}-night stay.`}
          />
        )}
      </div>

      <div className="card space-y-5">
        <div>
          <h3 className="font-display text-xl font-semibold">Your details</h3>
          <p className="mt-1 text-sm text-corner-muted">
            We&rsquo;ll review your request and reply within 24 hours.
          </p>
        </div>

        {pricing && (
          <PriceBreakdown
            nights={nights}
            subtotalAmount={pricing.accommodationSubtotal}
            cleaningFeeAmount={pricing.cleaningFeeAmount}
            serviceFeeAmount={pricing.serviceFeeAmount}
            discountAmount={pricing.discountAmount}
            securityDepositAmount={pricing.securityDepositAmount}
            totalAmount={pricing.totalAccommodationPrice}
            depositAmount={pricing.depositAmount}
            balanceAmount={pricing.balanceAmount}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="firstName">
              First name
            </label>
            <input
              id="firstName"
              required
              className="input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="lastName">
              Last name
            </label>
            <input
              id="lastName"
              required
              className="input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="guestEmail">
            Email address
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="guestPhone">
              Mobile number
            </label>
            <input
              id="guestPhone"
              type="tel"
              required
              className="input"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="guestCountry">
              Country
            </label>
            <input
              id="guestCountry"
              required
              list="country-list"
              className="input"
              value={guestCountry}
              onChange={(e) => setGuestCountry(e.target.value)}
            />
            <datalist id="country-list">
              {COMMON_COUNTRIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-corner-stone p-4">
          <p className="label mb-0">Guests</p>
          <GuestCounter label="Adults" value={adultsCount} onChange={setAdultsCount} min={1} />
          <GuestCounter label="Children" hint="Under 12" value={childrenCount} onChange={setChildrenCount} />
          {overCapacity && (
            <p className="text-xs text-corner-error">
              Maximum {propertyDetails.maxGuests} guests — you have {totalGuests}.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="estimatedArrivalTime">
              Estimated arrival time
            </label>
            <input
              id="estimatedArrivalTime"
              placeholder="e.g. 15:00"
              className="input"
              value={estimatedArrivalTime}
              onChange={(e) => setEstimatedArrivalTime(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="bookingPurpose">
              Purpose of stay (optional)
            </label>
            <select
              id="bookingPurpose"
              className="input"
              value={bookingPurpose}
              onChange={(e) => setBookingPurpose(e.target.value)}
            >
              <option value="">Prefer not to say</option>
              <option value="leisure">Leisure</option>
              <option value="business">Business</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="message">
            Special requests (optional)
          </label>
          <textarea
            id="message"
            className="input"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="space-y-2.5 border-t border-corner-stone pt-4">
          <label className="flex items-start gap-2.5 text-sm text-corner-muted">
            <input
              type="checkbox"
              checked={termsAgreed}
              onChange={(e) => setTermsAgreed(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 rounded border-corner-stone text-corner-gold focus:ring-corner-gold"
            />
            <span>
              I accept the{' '}
              <a href="/faq#policies" className="text-corner-gold underline hover:no-underline" target="_blank" rel="noreferrer">
                booking terms
              </a>
              .
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-sm text-corner-muted">
            <input
              type="checkbox"
              checked={cancellationPolicyAgreed}
              onChange={(e) => setCancellationPolicyAgreed(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 rounded border-corner-stone text-corner-gold focus:ring-corner-gold"
            />
            <span>
              I accept the{' '}
              <a href="/faq#policies" className="text-corner-gold underline hover:no-underline" target="_blank" rel="noreferrer">
                cancellation policy
              </a>
              .
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-sm text-corner-muted">
            <input
              type="checkbox"
              checked={communicationConsent}
              onChange={(e) => setCommunicationConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-corner-stone text-corner-gold focus:ring-corner-gold"
            />
            <span>I consent to receive booking-related emails and messages about this stay.</span>
          </label>
        </div>

        {error && <Alert variant="error" title="Couldn't send your request" description={error} />}

        <Button type="submit" loading={submitting} className="w-full" disabled={!canSubmit}>
          <CheckCircle2 aria-hidden className="h-4 w-4" />
          Request to book
        </Button>
      </div>
    </form>
  );
}

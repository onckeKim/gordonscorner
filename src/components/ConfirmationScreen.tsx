import { CheckCircle2 } from 'lucide-react';
import { PriceBreakdown } from '@/components/PriceBreakdown';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface ConfirmationScreenProps {
  guestName: string;
  reference: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  totalAmount: number;
  depositAmount: number;
  balanceAmount: number;
  balancePaid?: boolean;
}

/** Full confirmation summary shown once a deposit has been paid and a booking is confirmed. */
export function ConfirmationScreen({
  guestName,
  reference,
  checkIn,
  checkOut,
  nights,
  guestsCount,
  totalAmount,
  depositAmount,
  balanceAmount,
  balancePaid = false,
}: ConfirmationScreenProps) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-corner-success/10">
        <CheckCircle2 aria-hidden className="h-8 w-8 text-corner-success" />
      </span>
      <h1 className="mt-5 font-display text-3xl font-semibold text-corner-charcoal">
        You&rsquo;re confirmed, {guestName}
      </h1>
      <p className="mt-2 text-corner-muted">Your deposit has been received and your stay is locked in.</p>

      <p className="mt-6 font-display text-2xl tracking-wide text-corner-gold">{reference}</p>

      <div className="card mt-6 text-left">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="label">Check-in</p>
            <p className="text-corner-charcoal">{formatDate(checkIn)}</p>
          </div>
          <div>
            <p className="label">Check-out</p>
            <p className="text-corner-charcoal">{formatDate(checkOut)}</p>
          </div>
          <div>
            <p className="label">Nights</p>
            <p className="text-corner-charcoal">{nights}</p>
          </div>
          <div>
            <p className="label">Guests</p>
            <p className="text-corner-charcoal">{guestsCount}</p>
          </div>
        </div>

        <PriceBreakdown
          className="mt-5"
          nights={nights}
          totalAmount={totalAmount}
          depositAmount={depositAmount}
          balanceAmount={balanceAmount}
          depositPaid
          balancePaid={balancePaid}
        />
      </div>

      <p className="mt-6 text-sm text-corner-muted">
        A confirmation email with these details has been sent to you. Save this page or the emailed
        link to check your booking status anytime.
      </p>
    </div>
  );
}

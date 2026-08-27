import { BookingForm } from '@/components/BookingForm';
import { bookingRules } from '@/lib/config';

export const metadata = { title: 'Check availability — Gordon’s Corner' };

export default function BookPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-display text-4xl font-semibold">Request your stay</h1>
      <p className="mt-2 max-w-xl text-corner-muted">
        Select your dates below. A minimum stay of {bookingRules.minNights} nights applies. We
        review every request and reply within 24 hours.
      </p>
      <div className="mt-10">
        <BookingForm />
      </div>
    </div>
  );
}

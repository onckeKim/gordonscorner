'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ManualBookingForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adultsCount, setAdultsCount] = useState(2);
  const [childrenCount, setChildrenCount] = useState(0);
  const [initialStatus, setInitialStatus] = useState<'confirmed' | 'accepted_awaiting_deposit'>('accepted_awaiting_deposit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/bookings/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          guestEmail,
          guestPhone: guestPhone || undefined,
          checkIn,
          checkOut,
          adultsCount,
          childrenCount,
          initialStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not create booking.');
      router.push(`/admin/bookings/${data.booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary w-full">
        Create booking manually
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Create booking manually</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-corner-muted hover:underline">
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="mbFirstName">First name</label>
          <input id="mbFirstName" required className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="mbLastName">Last name</label>
          <input id="mbLastName" required className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="mbEmail">Email</label>
        <input id="mbEmail" type="email" required className="input" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="mbPhone">Phone (optional)</label>
        <input id="mbPhone" className="input" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="mbCheckIn">Check-in</label>
          <input id="mbCheckIn" type="date" required className="input" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="mbCheckOut">Check-out</label>
          <input id="mbCheckOut" type="date" required className="input" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="mbAdults">Adults</label>
          <input id="mbAdults" type="number" min={1} required className="input" value={adultsCount} onChange={(e) => setAdultsCount(Number(e.target.value))} />
        </div>
        <div>
          <label className="label" htmlFor="mbChildren">Children</label>
          <input id="mbChildren" type="number" min={0} className="input" value={childrenCount} onChange={(e) => setChildrenCount(Number(e.target.value))} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="mbStatus">On creation</label>
        <select id="mbStatus" className="input" value={initialStatus} onChange={(e) => setInitialStatus(e.target.value as typeof initialStatus)}>
          <option value="accepted_awaiting_deposit">Hold dates &amp; email a deposit link (normal flow)</option>
          <option value="confirmed">Mark confirmed immediately (payment arranged separately)</option>
        </select>
      </div>
      {error && <p className="text-sm text-corner-error">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? 'Creating…' : 'Create booking'}
      </button>
    </form>
  );
}

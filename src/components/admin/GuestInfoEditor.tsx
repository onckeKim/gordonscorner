'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Booking } from '@/types/database';

export function GuestInfoEditor({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(booking.guest_first_name ?? '');
  const [lastName, setLastName] = useState(booking.guest_last_name ?? '');
  const [email, setEmail] = useState(booking.guest_email);
  const [phone, setPhone] = useState(booking.guest_phone ?? '');
  const [country, setCountry] = useState(booking.guest_country ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/guest-info`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone, country }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save.');
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-xs text-corner-gold underline hover:no-underline">
        Edit guest details
      </button>
    );
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-2 rounded-lg border border-corner-stone p-4 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="giFirstName">First name</label>
          <input id="giFirstName" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="giLastName">Last name</label>
          <input id="giLastName" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="giEmail">Email</label>
        <input id="giEmail" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="giPhone">Phone</label>
          <input id="giPhone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="giCountry">Country</label>
          <input id="giCountry" className="input" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-corner-error">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary flex-1 text-xs">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="btn-secondary text-xs">
          Cancel
        </button>
      </div>
    </form>
  );
}

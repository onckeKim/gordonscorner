'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingLookupPage() {
  const router = useRouter();
  const [value, setValue] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      router.push(`/booking/${encodeURIComponent(value.trim())}`);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="font-display text-3xl font-semibold">Find your booking</h1>
      <p className="mt-2 text-sm text-corner-muted">
        Enter the booking reference from your confirmation email (e.g. GC-2026-4V9K), or use the
        link we emailed you directly.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
        <input
          className="input"
          placeholder="GC-2026-4V9K"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0">
          Find
        </button>
      </form>
    </div>
  );
}

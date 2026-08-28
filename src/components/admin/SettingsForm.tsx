'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Settings } from '@/types/database';

type FormState = Omit<Settings, 'id' | 'updated_at' | 'updated_by'>;

function toFormState(s: Settings): FormState {
  const { id: _id, updated_at: _u, updated_by: _ub, ...rest } = s;
  return rest;
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(toFormState(settings));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save settings.');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="card">
        <h2 className="font-display text-lg font-semibold">Property</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="property_name">Property name</label>
            <input id="property_name" className="input" value={form.property_name} onChange={(e) => set('property_name', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="currency">Currency (ISO code)</label>
            <input id="currency" className="input" maxLength={3} value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="label" htmlFor="time_zone">Time zone (IANA)</label>
            <input id="time_zone" className="input" value={form.time_zone} onChange={(e) => set('time_zone', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="guest_capacity">Guest capacity</label>
            <input id="guest_capacity" type="number" min={1} className="input" value={form.guest_capacity} onChange={(e) => set('guest_capacity', Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="check_in_time">Check-in time</label>
            <input id="check_in_time" type="time" className="input" value={form.check_in_time} onChange={(e) => set('check_in_time', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="check_out_time">Check-out time</label>
            <input id="check_out_time" type="time" className="input" value={form.check_out_time} onChange={(e) => set('check_out_time', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="admin_notification_email">Admin notification email</label>
            <input id="admin_notification_email" type="email" className="input" value={form.admin_notification_email} onChange={(e) => set('admin_notification_email', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold">Pricing & fees</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="default_nightly_rate">Default nightly rate</label>
            <input id="default_nightly_rate" type="number" min={0} step="0.01" className="input" value={form.default_nightly_rate} onChange={(e) => set('default_nightly_rate', Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="weekend_nightly_rate">Weekend nightly rate (blank = same as default)</label>
            <input
              id="weekend_nightly_rate"
              type="number"
              min={0}
              step="0.01"
              className="input"
              value={form.weekend_nightly_rate ?? ''}
              onChange={(e) => set('weekend_nightly_rate', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <label className="label" htmlFor="deposit_percentage">Deposit percentage</label>
            <input id="deposit_percentage" type="number" min={1} max={100} className="input" value={form.deposit_percentage} onChange={(e) => set('deposit_percentage', Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="tax_rate_percent">Tax rate (%)</label>
            <input id="tax_rate_percent" type="number" min={0} max={100} step="0.01" className="input" value={form.tax_rate_percent} onChange={(e) => set('tax_rate_percent', Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="cleaning_fee">Cleaning fee</label>
            <input id="cleaning_fee" type="number" min={0} step="0.01" className="input" value={form.cleaning_fee} onChange={(e) => set('cleaning_fee', Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="service_fee">Service fee</label>
            <input id="service_fee" type="number" min={0} step="0.01" className="input" value={form.service_fee} onChange={(e) => set('service_fee', Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="security_deposit">Security deposit</label>
            <input id="security_deposit" type="number" min={0} step="0.01" className="input" value={form.security_deposit} onChange={(e) => set('security_deposit', Number(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold">Booking rules</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="min_nights">Minimum stay (nights)</label>
            <input id="min_nights" type="number" min={1} className="input" value={form.min_nights} onChange={(e) => set('min_nights', Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="max_nights">Maximum stay (nights)</label>
            <input id="max_nights" type="number" min={1} className="input" value={form.max_nights} onChange={(e) => set('max_nights', Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="lead_time_hours">Booking lead time (hours)</label>
            <input id="lead_time_hours" type="number" min={0} className="input" value={form.lead_time_hours} onChange={(e) => set('lead_time_hours', Number(e.target.value))} />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.same_day_booking_enabled} onChange={(e) => set('same_day_booking_enabled', e.target.checked)} />
              Allow same-day bookings (bypasses lead time)
            </label>
          </div>
          <div>
            <label className="label" htmlFor="max_advance_booking_days">Max advance booking (days)</label>
            <input id="max_advance_booking_days" type="number" min={1} className="input" value={form.max_advance_booking_days} onChange={(e) => set('max_advance_booking_days', Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="hold_period_hours">Temporary hold period (hours)</label>
            <input id="hold_period_hours" type="number" min={1} className="input" value={form.hold_period_hours} onChange={(e) => set('hold_period_hours', Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="payment_deadline_hours">Deposit payment deadline (hours)</label>
            <input id="payment_deadline_hours" type="number" min={1} className="input" value={form.payment_deadline_hours} onChange={(e) => set('payment_deadline_hours', Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="balance_payment_deadline_days">Balance payment deadline (days before check-in)</label>
            <input id="balance_payment_deadline_days" type="number" min={0} className="input" value={form.balance_payment_deadline_days} onChange={(e) => set('balance_payment_deadline_days', Number(e.target.value))} />
          </div>
        </div>
        <div className="mt-3">
          <label className="label" htmlFor="cancellation_policy">Cancellation rules</label>
          <textarea id="cancellation_policy" rows={3} className="input" value={form.cancellation_policy} onChange={(e) => set('cancellation_policy', e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-corner-error">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Saving…' : 'Save settings'}
        </button>
        {saved && <span className="text-sm text-corner-success">Saved</span>}
      </div>
    </form>
  );
}

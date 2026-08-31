'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Settings } from '@/types/database';

type FormState = Pick<
  Settings,
  | 'ga4_measurement_id'
  | 'gtm_container_id'
  | 'clarity_project_id'
  | 'fb_pixel_id'
  | 'gsc_verification_code'
  | 'google_business_profile_url'
  | 'google_place_id'
  | 'latitude'
  | 'longitude'
  | 'service_area'
  | 'default_og_image_url'
>;

function toFormState(s: Settings): FormState {
  return {
    ga4_measurement_id: s.ga4_measurement_id,
    gtm_container_id: s.gtm_container_id,
    clarity_project_id: s.clarity_project_id,
    fb_pixel_id: s.fb_pixel_id,
    gsc_verification_code: s.gsc_verification_code,
    google_business_profile_url: s.google_business_profile_url,
    google_place_id: s.google_place_id,
    latitude: s.latitude,
    longitude: s.longitude,
    service_area: s.service_area,
    default_og_image_url: s.default_og_image_url,
  };
}

export function SeoSettingsForm({ settings }: { settings: Settings }) {
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
      const res = await fetch('/api/admin/seo/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save SEO settings.');
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
        <h2 className="font-display text-lg font-semibold">Tracking & tag manager</h2>
        <p className="mt-1 text-xs text-corner-muted">
          Nothing loads on the site until an ID is set here. Prefer GA4 direct <em>or</em> GTM, not
          both, to avoid double-counting pageviews.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ga4_measurement_id">GA4 Measurement ID</label>
            <input id="ga4_measurement_id" className="input" placeholder="G-XXXXXXXXXX" value={form.ga4_measurement_id ?? ''} onChange={(e) => set('ga4_measurement_id', e.target.value || null)} />
          </div>
          <div>
            <label className="label" htmlFor="gtm_container_id">Google Tag Manager container ID</label>
            <input id="gtm_container_id" className="input" placeholder="GTM-XXXXXXX" value={form.gtm_container_id ?? ''} onChange={(e) => set('gtm_container_id', e.target.value || null)} />
          </div>
          <div>
            <label className="label" htmlFor="clarity_project_id">Microsoft Clarity project ID</label>
            <input id="clarity_project_id" className="input" value={form.clarity_project_id ?? ''} onChange={(e) => set('clarity_project_id', e.target.value || null)} />
          </div>
          <div>
            <label className="label" htmlFor="fb_pixel_id">Meta/Facebook Pixel ID</label>
            <input id="fb_pixel_id" className="input" value={form.fb_pixel_id ?? ''} onChange={(e) => set('fb_pixel_id', e.target.value || null)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold">Search Console</h2>
        <div className="mt-3">
          <label className="label" htmlFor="gsc_verification_code">Verification content value</label>
          <input
            id="gsc_verification_code"
            className="input"
            placeholder="From the HTML tag method in Search Console (just the content= value)"
            value={form.gsc_verification_code ?? ''}
            onChange={(e) => set('gsc_verification_code', e.target.value || null)}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold">Local SEO</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="google_business_profile_url">Google Business Profile URL</label>
            <input id="google_business_profile_url" className="input" placeholder="https://g.page/..." value={form.google_business_profile_url ?? ''} onChange={(e) => set('google_business_profile_url', e.target.value || null)} />
          </div>
          <div>
            <label className="label" htmlFor="google_place_id">Google Place ID</label>
            <input id="google_place_id" className="input" value={form.google_place_id ?? ''} onChange={(e) => set('google_place_id', e.target.value || null)} />
          </div>
          <div>
            <label className="label" htmlFor="latitude">Latitude</label>
            <input id="latitude" type="number" step="0.000001" className="input" value={form.latitude ?? ''} onChange={(e) => set('latitude', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="longitude">Longitude</label>
            <input id="longitude" type="number" step="0.000001" className="input" value={form.longitude ?? ''} onChange={(e) => set('longitude', e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <label className="label" htmlFor="service_area">Service area description</label>
            <input id="service_area" className="input" placeholder="e.g. Hermanus and the surrounding Overberg region" value={form.service_area ?? ''} onChange={(e) => set('service_area', e.target.value || null)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-display text-lg font-semibold">Social sharing</h2>
        <div className="mt-3">
          <label className="label" htmlFor="default_og_image_url">Default OG image URL (overrides the generated default)</label>
          <input id="default_og_image_url" className="input" value={form.default_og_image_url ?? ''} onChange={(e) => set('default_og_image_url', e.target.value || null)} />
        </div>
      </div>

      {error && <p className="text-sm text-corner-error">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Saving…' : 'Save SEO settings'}
        </button>
        {saved && <span className="text-sm text-corner-success">Saved</span>}
      </div>
    </form>
  );
}

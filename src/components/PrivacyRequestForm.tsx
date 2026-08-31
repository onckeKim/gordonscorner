'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

type RequestType = 'export' | 'correction' | 'deletion';

const REQUEST_TYPES: { value: RequestType; label: string; description: string }[] = [
  { value: 'export', label: 'Export my data', description: 'Send me a copy of the personal information you hold about me.' },
  { value: 'correction', label: 'Correct my data', description: 'Some of my information is inaccurate and needs to be corrected.' },
  { value: 'deletion', label: 'Delete my data', description: 'Delete my personal information, where you are not required to keep it.' },
];

/** Public data-subject request form — posts to /api/privacy-requests for admin triage. */
export function PrivacyRequestForm() {
  const [requestType, setRequestType] = useState<RequestType>('export');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — left blank by real visitors
  const [formRenderedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/privacy-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType, name, email, details, website, formRenderedAt }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not submit your request. Please try again.');
      }
      setStatus('success');
      setName('');
      setEmail('');
      setDetails('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not submit your request. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <Alert
        variant="success"
        title="Request received"
        description="We've received your request and will respond within 30 days, as required by law. If we need more information to verify your identity, we'll contact you at the email address you provided."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {status === 'error' && (
          <Alert variant="error" title="Couldn't submit your request" description={errorMessage} />
        )}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
          <label htmlFor="privacy-website">Website</label>
          <input
            id="privacy-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <fieldset>
          <legend className="label">Request type</legend>
          <div className="mt-2 space-y-2">
            {REQUEST_TYPES.map((t) => (
              <label key={t.value} className="flex items-start gap-3 rounded-lg border border-corner-border p-3 text-sm">
                <input
                  type="radio"
                  name="requestType"
                  value={t.value}
                  checked={requestType === t.value}
                  onChange={() => setRequestType(t.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium">{t.label}</span>
                  <span className="block text-corner-muted">{t.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="privacy-name">
            Full name
          </label>
          <input
            id="privacy-name"
            required
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="privacy-email">
            Email address
          </label>
          <input
            id="privacy-email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="mt-1 text-xs text-corner-muted">Use the same email address you booked or enquired with, if possible.</p>
        </div>
        <div>
          <label className="label" htmlFor="privacy-details">
            Additional details (optional)
          </label>
          <textarea
            id="privacy-details"
            rows={4}
            className="input"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="E.g. your booking reference, or what needs to be corrected."
          />
        </div>
        <Button type="submit" variant="primary" loading={status === 'submitting'} className="w-full">
          Submit request
        </Button>
      </div>
    </form>
  );
}

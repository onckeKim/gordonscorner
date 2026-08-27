'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

/** General enquiry section — not a marketing newsletter signup, since this
 * is a single-property booking site: a direct line to ask a question before
 * committing to a booking request is more useful here. */
export function Newsletter() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const headingId = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not send your message. Please try again.');
      }
      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not send your message. Please try again.');
      setStatus('error');
    }
  }

  return (
    <section aria-labelledby={headingId} className="bg-corner-forest">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Get in touch</p>
          <h2 id={headingId} className="mt-3 font-display text-3xl font-semibold text-corner-ivory sm:text-4xl">
            Have a question before you book?
          </h2>
          <p className="mt-4 max-w-md text-corner-ivory/70">
            Send us a message and we&rsquo;ll reply personally — usually within a day.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl2 bg-corner-white p-6 shadow-soft-lg sm:p-8">
          {status === 'success' ? (
            <Alert
              variant="success"
              title="Message sent"
              description="Thanks for reaching out — we'll be in touch soon."
            />
          ) : (
            <div className="space-y-4">
              {status === 'error' && (
                <Alert variant="error" title="Couldn't send your message" description={errorMessage} />
              )}
              <div>
                <label className="label" htmlFor="enquiry-name">
                  Name
                </label>
                <input
                  id="enquiry-name"
                  required
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="enquiry-email">
                  Email
                </label>
                <input
                  id="enquiry-email"
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="enquiry-message">
                  Message
                </label>
                <textarea
                  id="enquiry-message"
                  required
                  rows={4}
                  className="input"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <Button type="submit" variant="primary" loading={status === 'submitting'} className="w-full">
                Send message
              </Button>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

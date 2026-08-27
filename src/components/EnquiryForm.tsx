'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

interface EnquiryFormProps {
  className?: string;
  /** Prefixes form field ids so the same form can appear more than once per page. */
  idPrefix?: string;
}

/** Standalone contact/enquiry form — posts to /api/enquiries, which emails the admin. */
export function EnquiryForm({ className, idPrefix = 'enquiry' }: EnquiryFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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

  if (status === 'success') {
    return (
      <Alert
        variant="success"
        title="Message sent"
        description="Thanks for reaching out — we'll be in touch soon."
        className={className}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        {status === 'error' && (
          <Alert variant="error" title="Couldn't send your message" description={errorMessage} />
        )}
        <div>
          <label className="label" htmlFor={`${idPrefix}-name`}>
            Name
          </label>
          <input
            id={`${idPrefix}-name`}
            required
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${idPrefix}-email`}>
            Email
          </label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor={`${idPrefix}-message`}>
            Message
          </label>
          <textarea
            id={`${idPrefix}-message`}
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
    </form>
  );
}

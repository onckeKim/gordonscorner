import type { Metadata } from 'next';
import Link from 'next/link';
import { PrivacyRequestForm } from '@/components/PrivacyRequestForm';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy request',
  description: `Request an export, correction, or deletion of the personal data ${siteConfig.propertyName} holds about you.`,
  alternates: { canonical: '/privacy-request' },
};

export default function PrivacyRequestPage() {
  return (
    <div>
      <section className="border-b border-corner-stone">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="eyebrow">Your data</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-corner-charcoal sm:text-5xl">
            Request your data
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-corner-muted">
            You can ask us to export a copy of the personal information we hold about you, correct
            inaccurate information, or delete it, subject to our legal obligation to retain certain
            booking and financial records for the statutory period. See our{' '}
            <Link href="/policies#privacy" className="text-corner-gold underline hover:no-underline">
              privacy policy
            </Link>{' '}
            for full details.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-xl px-6 py-16">
          <div className="card">
            <PrivacyRequestForm />
          </div>
        </div>
      </section>
    </div>
  );
}

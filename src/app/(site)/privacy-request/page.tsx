import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { PrivacyRequestForm } from '@/components/PrivacyRequestForm';
import { siteConfig } from '@/lib/config';
import { resolvePageSeo } from '@/lib/seo/page-overrides';

export async function generateMetadata(): Promise<Metadata> {
  return resolvePageSeo({
    path: '/privacy-request',
    title: 'Privacy request',
    description: `Request an export, correction, or deletion of the personal data ${siteConfig.propertyName} holds about you.`,
  });
}

export default function PrivacyRequestPage() {
  return (
    <div>
      <Breadcrumbs items={[{ name: 'Privacy request', path: '/privacy-request' }]} />
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

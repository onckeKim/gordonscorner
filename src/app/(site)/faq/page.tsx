import type { Metadata } from 'next';
import { Accordion } from '@/components/ui/Accordion';
import { PolicyAccordion } from '@/components/PolicyAccordion';
import { getContentSection } from '@/lib/content/store';
import { faqContentDefaults, policiesContentDefaults } from '@/lib/content/sections';
import type { FaqGroup } from '@/lib/content/faq';
import type { PolicyEntry } from '@/lib/content/policies';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description: `Answers to common questions about booking, payment, check-in and staying at ${siteConfig.propertyName}.`,
  alternates: { canonical: '/faq' },
};

export default async function FaqPage() {
  const [faqGroups, policies] = await Promise.all([
    getContentSection<FaqGroup[]>('faq', faqContentDefaults),
    getContentSection<PolicyEntry[]>('policies', policiesContentDefaults),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow text-center">FAQ</p>
      <h1 className="mt-3 text-center font-display text-4xl font-semibold text-corner-charcoal sm:text-5xl">
        Frequently asked questions
      </h1>
      <p className="mx-auto mt-4 max-w-md text-center text-corner-muted">
        Everything guests usually ask, from booking to check-out. Can&rsquo;t find your answer?{' '}
        <a href="/contact" className="text-corner-gold underline hover:no-underline">
          Get in touch
        </a>
        .
      </p>

      <div className="mt-14 space-y-14">
        {faqGroups.map((group) => (
          <div key={group.title}>
            <h2 className="font-display text-2xl font-semibold text-corner-charcoal">{group.title}</h2>
            <Accordion
              className="mt-4"
              items={group.items.map((item) => ({ id: item.id, title: item.question, content: item.answer }))}
            />
          </div>
        ))}
      </div>

      <div id="policies" className="mt-16 scroll-mt-24">
        <h2 className="font-display text-2xl font-semibold text-corner-charcoal">Policies</h2>
        <p className="mt-2 text-sm text-corner-muted">
          A short summary — see the full{' '}
          <a href="/policies" className="text-corner-gold underline hover:no-underline">
            booking, cancellation, house rules, damages &amp; security, and privacy policies
          </a>{' '}
          for complete details.
        </p>
        <div className="mt-4">
          <PolicyAccordion policies={policies} />
        </div>
      </div>
    </div>
  );
}

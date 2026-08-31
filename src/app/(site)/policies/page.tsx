import type { Metadata } from 'next';
import { Accordion } from '@/components/ui/Accordion';
import { siteConfig } from '@/lib/config';
import { getSettings } from '@/lib/settings';
import { getContentSection } from '@/lib/content/store';
import {
  bookingPolicyContentDefaults,
  cancellationPolicyContentDefaults,
  houseRulesContentDefaults,
  damagesSecurityContentDefaults,
  privacyContentDefaults,
  POLICY_VERSION,
  type BookingPolicySection,
  type CancellationPolicySection,
  type PolicyItem,
} from '@/lib/content/sections';

export const metadata: Metadata = {
  title: 'Booking policies',
  description: `Booking, cancellation, house rules, damages and privacy policies for ${siteConfig.propertyName}.`,
  alternates: { canonical: '/policies' },
};

function toAccordionItems(items: PolicyItem[]) {
  return items.map((i) => ({ id: i.id, title: i.title, content: i.content }));
}

export default async function PoliciesPage() {
  const [settings, bookingPolicy, cancellationPolicy, houseRules, damagesSecurity, privacy] = await Promise.all([
    getSettings(),
    getContentSection<BookingPolicySection>('bookingPolicy', bookingPolicyContentDefaults),
    getContentSection<CancellationPolicySection>('cancellationPolicy', cancellationPolicyContentDefaults),
    getContentSection<PolicyItem[]>('houseRules', houseRulesContentDefaults),
    getContentSection<PolicyItem[]>('damagesSecurity', damagesSecurityContentDefaults),
    getContentSection<PolicyItem[]>('privacyPolicy', privacyContentDefaults),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="eyebrow text-center">Policies</p>
      <h1 className="mt-3 text-center font-display text-4xl font-semibold text-corner-charcoal sm:text-5xl">
        Booking, cancellation &amp; house policies
      </h1>

      <div className="mt-8 rounded-xl2 border border-corner-gold/40 bg-corner-gold/10 p-5 text-sm text-corner-charcoal">
        <p className="font-semibold">Before you rely on this page</p>
        <p className="mt-1">
          This wording is a starting point prepared for {siteConfig.propertyName}, not vetted legal
          text. The property owner is responsible for reviewing it, and — for the cancellation,
          damages/security, and privacy sections in particular — should have it checked by a South
          African legal professional before relying on it for real bookings.
        </p>
      </div>

      {/* --------------------------------------------------------------- */}
      <section id="booking" className="mt-14 scroll-mt-24">
        <h2 className="font-display text-2xl font-semibold text-corner-charcoal">Booking policy</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl2 border border-corner-stone bg-corner-white p-5 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-corner-muted">Minimum stay</p>
            <p className="mt-1 font-medium">{settings.min_nights} nights</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-corner-muted">Deposit</p>
            <p className="mt-1 font-medium">{settings.deposit_percentage}%</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-corner-muted">Hold period</p>
            <p className="mt-1 font-medium">{settings.hold_period_hours} hours</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-corner-muted">Balance due</p>
            <p className="mt-1 font-medium">{settings.balance_payment_deadline_days} days before check-in</p>
          </div>
        </div>
        <p className="mt-4 text-corner-muted">{bookingPolicy.intro}</p>
        <ul className="mt-4 space-y-2">
          {bookingPolicy.items.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-corner-charcoal">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-corner-gold" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------------------- */}
      <section id="cancellation" className="mt-14 scroll-mt-24">
        <h2 className="font-display text-2xl font-semibold text-corner-charcoal">Cancellation policy</h2>

        <div className="mt-4 overflow-x-auto rounded-xl2 border border-corner-stone">
          <table className="w-full text-left text-sm">
            <thead className="bg-corner-ivory text-xs uppercase tracking-wide text-corner-muted">
              <tr>
                <th className="px-4 py-3">Cancel</th>
                <th className="px-4 py-3">Deposit refund</th>
              </tr>
            </thead>
            <tbody>
              {cancellationPolicy.tiers.map((tier) => (
                <tr key={tier.id} className="border-t border-corner-stone">
                  <td className="px-4 py-3">{tier.label}</td>
                  <td className="px-4 py-3 font-medium">{tier.refundPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-corner-muted">
          Refund percentages apply to the deposit paid, in {settings.currency}. The exact amount for
          your stay is shown on your booking confirmation.
        </p>

        <Accordion
          className="mt-6"
          items={[
            { id: 'guest-procedure', title: 'Guest cancellation procedure', content: cancellationPolicy.guestCancellationProcedure },
            { id: 'refund-eligibility', title: 'Refund eligibility', content: cancellationPolicy.refundEligibility },
            { id: 'admin-charges', title: 'Administrative or payment-provider charges', content: cancellationPolicy.adminAndProviderCharges },
            { id: 'late-cancellation', title: 'Late cancellation', content: cancellationPolicy.lateCancellation },
            { id: 'no-show', title: 'No-show procedure', content: cancellationPolicy.noShowProcedure },
            { id: 'early-departure', title: 'Early departure', content: cancellationPolicy.earlyDeparture },
            { id: 'cancellation-by-property', title: 'Cancellation by the property', content: cancellationPolicy.cancellationByProperty },
            { id: 'exceptional-circumstances', title: 'Exceptional circumstances', content: cancellationPolicy.exceptionalCircumstances },
            { id: 'refund-processing-time', title: 'Refund processing time', content: cancellationPolicy.refundProcessingTime },
          ]}
        />
      </section>

      {/* --------------------------------------------------------------- */}
      <section id="house-rules" className="mt-14 scroll-mt-24">
        <h2 className="font-display text-2xl font-semibold text-corner-charcoal">House rules</h2>
        <Accordion className="mt-4" items={toAccordionItems(houseRules)} />
      </section>

      {/* --------------------------------------------------------------- */}
      <section id="damages-security" className="mt-14 scroll-mt-24">
        <h2 className="font-display text-2xl font-semibold text-corner-charcoal">Damages &amp; security</h2>
        <Accordion className="mt-4" items={toAccordionItems(damagesSecurity)} />
      </section>

      {/* --------------------------------------------------------------- */}
      <section id="privacy" className="mt-14 scroll-mt-24">
        <h2 className="font-display text-2xl font-semibold text-corner-charcoal">Privacy</h2>
        <Accordion className="mt-4" items={toAccordionItems(privacy)} />
      </section>

      <p className="mt-14 text-center text-xs text-corner-muted">
        Policy version {POLICY_VERSION} &middot; Questions? Contact us at{' '}
        <a href={`mailto:${siteConfig.contactEmail}`} className="text-corner-gold underline hover:no-underline">
          {siteConfig.contactEmail}
        </a>
      </p>
    </div>
  );
}

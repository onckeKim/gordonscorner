import type { Metadata } from 'next';
import { Phone, Mail, MessageCircle, MapPin } from 'lucide-react';
import { EnquiryForm } from '@/components/EnquiryForm';
import { siteConfig } from '@/lib/config';
import { checkInSupportInfo, contactIntro } from '@/lib/content/contact';

export const metadata: Metadata = { title: `Contact — ${siteConfig.propertyName}` };

const CONTACT_METHODS = [
  {
    icon: Phone,
    label: 'Phone',
    value: siteConfig.contactPhone,
    href: `tel:${siteConfig.contactPhone}`,
  },
  {
    icon: Mail,
    label: 'Email',
    value: siteConfig.contactEmail,
    href: `mailto:${siteConfig.contactEmail}`,
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: 'Message us',
    href: `https://wa.me/${siteConfig.whatsappNumber}`,
  },
];

export default function ContactPage() {
  return (
    <div>
      <section className="border-b border-corner-stone">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="eyebrow">Contact</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-corner-charcoal sm:text-5xl">
            Get in touch
          </h1>
          <p className="mx-auto mt-4 max-w-md text-corner-muted">{contactIntro}</p>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2">
          <div>
            <div className="grid gap-4 sm:grid-cols-3">
              {CONTACT_METHODS.map((method) => (
                <a
                  key={method.label}
                  href={method.href}
                  target={method.label === 'WhatsApp' ? '_blank' : undefined}
                  rel={method.label === 'WhatsApp' ? 'noreferrer' : undefined}
                  className="card flex flex-col items-center gap-2 text-center transition-colors hover:bg-corner-ivory"
                >
                  <method.icon aria-hidden className="h-5 w-5 text-corner-gold" strokeWidth={1.5} />
                  <span className="text-xs uppercase tracking-wide text-corner-muted">{method.label}</span>
                  <span className="text-sm font-medium text-corner-charcoal">{method.value}</span>
                </a>
              ))}
            </div>

            <div className="card mt-6">
              <MapPin aria-hidden className="h-5 w-5 text-corner-gold" strokeWidth={1.5} />
              <p className="mt-2 font-display text-lg font-semibold text-corner-charcoal">Address</p>
              <p className="mt-1 text-sm text-corner-muted">
                {siteConfig.addressLine1}
                <br />
                {siteConfig.addressLine2}
                <br />
                {siteConfig.addressCountry}
              </p>
            </div>

            <div
              role="img"
              aria-label={`Map placeholder showing ${siteConfig.address}`}
              className="mt-6 aspect-[16/9] rounded-xl2 bg-gradient-to-br from-corner-forest/15 via-corner-stone to-corner-gold/15"
            />

            <div className="card mt-6">
              <p className="font-display text-lg font-semibold text-corner-charcoal">Check-in support</p>
              <p className="mt-2 text-sm text-corner-muted">{checkInSupportInfo}</p>
              <p className="mt-3 text-xs text-corner-muted">
                Emergency contact details are shared directly with confirmed guests as part of
                their booking confirmation and check-in instructions.
              </p>
            </div>
          </div>

          <div className="card">
            <h2 className="font-display text-xl font-semibold text-corner-charcoal">Send a message</h2>
            <p className="mt-1 text-sm text-corner-muted">We reply personally, usually within a day.</p>
            <EnquiryForm idPrefix="contact-page" className="mt-6" />
          </div>
        </div>
      </section>
    </div>
  );
}

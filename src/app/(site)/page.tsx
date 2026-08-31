import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Info } from 'lucide-react';
import { Hero } from '@/components/Hero';
import { PropertySummaryCard } from '@/components/PropertySummaryCard';
import { AmenitiesGrid } from '@/components/AmenityCard';
import { Gallery } from '@/components/Gallery';
import { Testimonials } from '@/components/Testimonials';
import { FAQ } from '@/components/FAQ';
import { Newsletter } from '@/components/Newsletter';
import { Alert } from '@/components/ui/Alert';
import { ButtonLink } from '@/components/ui/Button';
import { siteConfig, bookingRules, propertyDetails, pricingConfig } from '@/lib/config';
import { defaultMetaDescription } from '@/lib/seo';
import { getContentSection } from '@/lib/content/store';
import {
  siteContentDefaults,
  propertyContentDefaults,
  galleryContentDefaults,
  testimonialsContentDefaults,
  amenitiesContentDefaults,
  faqContentDefaults,
  type SiteContentSection,
  type PropertyContentSection,
  type AmenityEntry,
} from '@/lib/content/sections';
import type { GalleryPhoto } from '@/lib/content/gallery';
import type { TestimonialEntry } from '@/lib/content/testimonials';
import type { AccordionItem } from '@/components/ui/Accordion';
import { homeFaqIds, type FaqGroup } from '@/lib/content/faq';

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

export const metadata: Metadata = {
  // Root layout supplies the full site name in the title template's
  // suffix — the homepage uses `default` from the layout directly, so no
  // title override is needed here. A dedicated description and canonical
  // are still worth setting explicitly rather than inheriting.
  description: defaultMetaDescription,
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const [site, property, galleryPhotos, testimonials, faqGroups, amenities] = await Promise.all([
    getContentSection<SiteContentSection>('site', siteContentDefaults),
    getContentSection<PropertyContentSection>('property', propertyContentDefaults),
    getContentSection<GalleryPhoto[]>('gallery', galleryContentDefaults),
    getContentSection<TestimonialEntry[]>('testimonials', testimonialsContentDefaults),
    getContentSection<FaqGroup[]>('faq', faqContentDefaults),
    getContentSection<AmenityEntry[]>('amenities', amenitiesContentDefaults),
  ]);
  const homeFaqItems: AccordionItem[] = faqGroups
    .flatMap((g) => g.items)
    .filter((item) => homeFaqIds.includes(item.id))
    .map((item) => ({ id: item.id, title: item.question, content: item.answer }));
  const COLLAGE_PHOTOS = galleryPhotos.slice(0, 5);
  const GALLERY_PREVIEW_PHOTOS = galleryPhotos.slice(5, 10);

  return (
    <div>
      <Hero
        eyebrow={site.address}
        title={site.tagline}
        subtitle={site.description}
        primaryCta={{ href: '/book', label: 'Check Availability' }}
        secondaryCta={{ href: '/accommodation', label: 'Explore the stay' }}
        imageAlt="Gordon's Corner exterior in warm afternoon light"
      />

      <section aria-label="Featured photos" className="mx-auto max-w-6xl px-6 py-16">
        <Gallery images={COLLAGE_PHOTOS} />
      </section>

      <section id="stay" className="border-t border-corner-stone bg-corner-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-[1.3fr,1fr] lg:items-start">
            <div>
              <p className="eyebrow">Property overview</p>
              <h2 className="section-heading mt-3">A boutique retreat, entirely yours</h2>
              <p className="mt-5 max-w-xl text-corner-muted">{property.introShort}</p>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-corner-charcoal">
                <li>Sleeps {propertyDetails.maxGuests}</li>
                <li>{propertyDetails.bedrooms} bedrooms</li>
                <li>{propertyDetails.beds} beds</li>
                <li>{propertyDetails.bathrooms} bathroom</li>
              </ul>
              <Link href="/accommodation" className="mt-6 inline-block text-sm font-medium text-corner-gold underline hover:no-underline">
                View full accommodation details →
              </Link>
            </div>
            <PropertySummaryCard imageAlt="Gordon's Corner property exterior" />
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            <div className="card">
              <p className="eyebrow">Price per night</p>
              <p className="mt-2 font-display text-3xl font-semibold text-corner-charcoal">
                {formatZar(pricingConfig.standardNightlyRateZar)}
              </p>
              <p className="mt-1 text-sm text-corner-muted">
                Plus a {Math.round(bookingRules.depositRate * 100)}% deposit to secure your dates.
              </p>
            </div>
            <Alert
              variant="info"
              title={`Minimum ${bookingRules.minNights}-night stay`}
              description="This applies to every booking, all year round — the calendar won't offer shorter ranges."
            />
          </div>

          <div className="mt-16">
            <p className="eyebrow">What&rsquo;s included</p>
            <h2 className="section-heading mt-3">Everything you need, nothing you don&rsquo;t</h2>
            <div className="mt-8">
              <AmenitiesGrid amenities={amenities} />
            </div>
          </div>

          <div className="mt-16">
            <p className="eyebrow">Highlights</p>
            <h2 className="section-heading mt-3">Accommodation highlights</h2>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {property.houseFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-corner-charcoal">
                  <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-corner-gold" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="gallery" className="border-t border-corner-stone">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Gallery</p>
              <h2 className="section-heading mt-3">A closer look</h2>
            </div>
            <Link href="/gallery" className="text-sm font-medium text-corner-gold underline hover:no-underline">
              View full gallery →
            </Link>
          </div>
          <div className="mt-10">
            <Gallery images={GALLERY_PREVIEW_PHOTOS} />
          </div>
        </div>
      </section>

      <section className="border-t border-corner-stone bg-corner-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow text-center">What guests say</p>
          <h2 className="section-heading mt-3 text-center">Kind words from past stays</h2>
          <div className="mt-10">
            <Testimonials testimonials={testimonials} />
          </div>
        </div>
      </section>

      <section className="border-t border-corner-stone">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow">Location</p>
            <h2 className="section-heading mt-3">{site.address}</h2>
            <p className="mt-4 max-w-md text-corner-muted">{property.locationSummary}</p>
            <p className="mt-4 flex items-center gap-2 text-sm text-corner-charcoal">
              <MapPin aria-hidden className="h-4 w-4 text-corner-gold" />
              {site.addressLine1}, {site.addressLine2}
            </p>
            <Link href="/accommodation#location" className="mt-4 inline-block text-sm font-medium text-corner-gold underline hover:no-underline">
              More on the area →
            </Link>
          </div>
          <div
            role="img"
            aria-label={`Map placeholder showing ${site.address}`}
            className="aspect-[4/3] rounded-xl2 bg-gradient-to-br from-corner-forest/15 via-corner-stone to-corner-gold/15"
          />
        </div>
      </section>

      <section id="faq" className="border-t border-corner-stone bg-corner-white">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <p className="eyebrow text-center">FAQ</p>
          <h2 className="section-heading mt-3 text-center">Frequently asked questions</h2>
          <div className="mt-10">
            <FAQ items={homeFaqItems} />
          </div>
          <p className="mt-6 text-center text-sm">
            <Link href="/faq" className="font-medium text-corner-gold underline hover:no-underline">
              View all FAQs →
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-corner-stone">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="eyebrow">Good to know</p>
          <h2 className="section-heading mt-3">Policies at a glance</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="card text-left">
              <Info aria-hidden className="h-4 w-4 text-corner-gold" />
              <p className="mt-2 text-sm font-medium text-corner-charcoal">Minimum stay</p>
              <p className="mt-1 text-sm text-corner-muted">{bookingRules.minNights} nights, every booking</p>
            </div>
            <div className="card text-left">
              <Info aria-hidden className="h-4 w-4 text-corner-gold" />
              <p className="mt-2 text-sm font-medium text-corner-charcoal">Deposit</p>
              <p className="mt-1 text-sm text-corner-muted">
                {Math.round(bookingRules.depositRate * 100)}% to confirm your booking
              </p>
            </div>
            <div className="card text-left">
              <Info aria-hidden className="h-4 w-4 text-corner-gold" />
              <p className="mt-2 text-sm font-medium text-corner-charcoal">Cancellation</p>
              <p className="mt-1 text-sm text-corner-muted">Free up to 14 days before check-in</p>
            </div>
          </div>
          <Link href="/faq#policies" className="mt-6 inline-block text-sm font-medium text-corner-gold underline hover:no-underline">
            Read the full policy →
          </Link>
        </div>
      </section>

      <Newsletter />

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="section-heading">Ready to book your stay?</h2>
        <p className="mx-auto mt-3 max-w-md text-corner-muted">
          Minimum {bookingRules.minNights}-night stay. We review every request personally.
        </p>
        <ButtonLink href="/book" variant="primary" size="lg" className="mt-6">
          Book Your Stay
        </ButtonLink>
      </section>
    </div>
  );
}

import type { Metadata } from 'next';
import { MapPin, Users, BedDouble, Bath, Clock, ShieldCheck, Car, Accessibility } from 'lucide-react';
import { AmenitiesGrid } from '@/components/AmenityCard';
import { FilterableGallery } from '@/components/FilterableGallery';
import { AccommodationAvailability } from '@/components/AccommodationAvailability';
import { ButtonLink } from '@/components/ui/Button';
import { bookingRules, propertyDetails, siteConfig } from '@/lib/config';
import { propertyIntro, houseFeatures, accessibilityInfo, parkingInfo, safetyInfo, locationSummary } from '@/lib/content/property';
import { galleryPhotos } from '@/lib/content/gallery';

export const metadata: Metadata = { title: `Accommodation — ${siteConfig.propertyName}` };

const CAPACITY_STATS = [
  { icon: Users, label: 'Guests', value: `Up to ${propertyDetails.maxGuests}` },
  { icon: BedDouble, label: 'Bedrooms', value: `${propertyDetails.bedrooms}` },
  { icon: BedDouble, label: 'Beds', value: `${propertyDetails.beds}` },
  { icon: Bath, label: 'Bathrooms', value: `${propertyDetails.bathrooms}` },
];

function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount);
}

export default function AccommodationPage() {
  return (
    <div>
      <section className="border-b border-corner-stone">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="eyebrow">The Accommodation</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-corner-charcoal sm:text-5xl">
            Gordon&rsquo;s Corner
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-corner-muted">{propertyIntro.full}</p>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CAPACITY_STATS.map((stat) => (
              <div key={stat.label} className="card text-center">
                <stat.icon aria-hidden className="mx-auto h-5 w-5 text-corner-gold" strokeWidth={1.5} />
                <p className="mt-2 font-display text-xl font-semibold text-corner-charcoal">{stat.value}</p>
                <p className="text-xs uppercase tracking-wide text-corner-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-corner-muted">
            <span className="flex items-center gap-2">
              <Clock aria-hidden className="h-4 w-4 text-corner-gold" />
              Check-in from {propertyDetails.checkInTime} &middot; Check-out by {propertyDetails.checkOutTime}
            </span>
          </div>
        </div>
      </section>

      <section className="border-b border-corner-stone bg-corner-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="eyebrow">Amenities</p>
          <h2 className="section-heading mt-3">What&rsquo;s included</h2>
          <div className="mt-8">
            <AmenitiesGrid />
          </div>

          <p className="eyebrow mt-16">House features</p>
          <h2 className="section-heading mt-3">A closer look at the space</h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {houseFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-corner-charcoal">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-corner-gold" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-corner-stone">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="eyebrow">Gallery</p>
          <h2 className="section-heading mt-3">Every room, in detail</h2>
          <div className="mt-8">
            <FilterableGallery photos={galleryPhotos} />
          </div>
        </div>
      </section>

      <section className="border-b border-corner-stone bg-corner-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3">
          <div className="card">
            <Accessibility aria-hidden className="h-5 w-5 text-corner-gold" strokeWidth={1.5} />
            <h3 className="mt-3 font-display text-lg font-semibold text-corner-charcoal">Accessibility</h3>
            <p className="mt-2 text-sm text-corner-muted">{accessibilityInfo}</p>
          </div>
          <div className="card">
            <Car aria-hidden className="h-5 w-5 text-corner-gold" strokeWidth={1.5} />
            <h3 className="mt-3 font-display text-lg font-semibold text-corner-charcoal">Parking</h3>
            <p className="mt-2 text-sm text-corner-muted">{parkingInfo}</p>
          </div>
          <div className="card">
            <ShieldCheck aria-hidden className="h-5 w-5 text-corner-gold" strokeWidth={1.5} />
            <h3 className="mt-3 font-display text-lg font-semibold text-corner-charcoal">Safety</h3>
            <ul className="mt-2 space-y-1 text-sm text-corner-muted">
              {safetyInfo.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="location" className="scroll-mt-24 border-b border-corner-stone">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow">Location</p>
            <h2 className="section-heading mt-3">{siteConfig.address}</h2>
            <p className="mt-4 max-w-md text-corner-muted">{locationSummary}</p>
            <p className="mt-4 flex items-center gap-2 text-sm text-corner-charcoal">
              <MapPin aria-hidden className="h-4 w-4 text-corner-gold" />
              {siteConfig.addressLine1}, {siteConfig.addressLine2}
            </p>
          </div>
          <div
            role="img"
            aria-label={`Map placeholder showing ${siteConfig.address}`}
            className="aspect-[4/3] rounded-xl2 bg-gradient-to-br from-corner-forest/15 via-corner-stone to-corner-gold/15"
          />
        </div>
      </section>

      <section className="border-b border-corner-stone bg-corner-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="eyebrow">Pricing</p>
          <h2 className="section-heading mt-3">
            From {formatZar(bookingRules.nightlyRateZar)} / night
          </h2>
          <p className="mx-auto mt-3 max-w-md text-corner-muted">
            Minimum stay of {bookingRules.minNights} nights. A {Math.round(bookingRules.depositRate * 100)}%
            deposit secures your dates once your request is approved.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="eyebrow text-center">Check availability</p>
        <h2 className="section-heading mt-3 text-center">See open dates</h2>
        <div className="mx-auto mt-8 max-w-xl">
          <AccommodationAvailability />
        </div>
        <div className="mt-8 text-center">
          <ButtonLink href="/book" variant="primary" size="lg">
            Book your stay
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}

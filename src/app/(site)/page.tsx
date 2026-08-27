import { Hero } from '@/components/Hero';
import { PropertySummaryCard } from '@/components/PropertySummaryCard';
import { AmenitiesGrid } from '@/components/AmenityCard';
import { Gallery } from '@/components/Gallery';
import { Testimonials } from '@/components/Testimonials';
import { FAQ } from '@/components/FAQ';
import { PolicyAccordion } from '@/components/PolicyAccordion';
import { Newsletter } from '@/components/Newsletter';
import { ButtonLink } from '@/components/ui/Button';
import { siteConfig, bookingRules } from '@/lib/config';

const STORY_ROWS = [
  {
    title: 'Considered spaces',
    body: 'Warm, uncluttered interiors designed for slow mornings and easy evenings — every detail chosen with a guest’s stay in mind.',
    imageAlt: 'Sunlit living area at Gordon’s Corner with soft neutral furnishings',
    reverse: false,
  },
  {
    title: 'A personal welcome',
    body: 'Every request is reviewed by hand — never an automatic yes, always a considered one. You’ll hear from us directly, not a booking algorithm.',
    imageAlt: 'A welcome basket of coffee and local treats set out on arrival',
    reverse: true,
  },
];

const GALLERY_IMAGES = [
  { alt: 'Living room with warm natural light and linen upholstery' },
  { alt: 'Bedroom with soft cream bedding and wooden headboard' },
  { alt: 'Kitchen with open shelving and stone countertops' },
  { alt: 'Outdoor seating area with braai and garden view' },
  { alt: 'Bathroom with freestanding tub and brass fixtures' },
];

const TESTIMONIALS = [
  { quote: 'Every detail felt considered — quiet, warm, and exactly as described.', author: 'Guest, Cape Town' },
  { quote: 'The booking process was refreshingly personal. Highly recommend.', author: 'Guest, Johannesburg' },
  { quote: 'We’ll be back. A genuinely peaceful stay from start to finish.', author: 'Guest, Durban' },
];

export default function HomePage() {
  return (
    <div>
      <Hero
        eyebrow={siteConfig.address}
        title={siteConfig.tagline}
        subtitle={siteConfig.description}
        primaryCta={{ href: '/book', label: 'Check availability' }}
        secondaryCta={{ href: '#stay', label: 'Explore the stay' }}
        imageAlt="Gordon's Corner exterior in warm afternoon light"
      />

      <section id="stay" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr,1fr] lg:items-start">
          <div>
            <p className="eyebrow">The Stay</p>
            <h2 className="section-heading mt-3">A boutique retreat, entirely yours</h2>
            <p className="mt-5 max-w-xl text-corner-muted">
              Gordon&rsquo;s Corner is a self-contained short-stay property set up for guests who
              want a calm, well-appointed base — whether for a weekend or a longer escape.
              Minimum stay is {bookingRules.minNights} nights.
            </p>
          </div>
          <PropertySummaryCard imageAlt="Gordon's Corner property exterior" />
        </div>

        <div className="mt-20 space-y-20">
          {STORY_ROWS.map((row) => (
            <div
              key={row.title}
              className={`grid items-center gap-10 lg:grid-cols-2 ${row.reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}
            >
              <div
                role="img"
                aria-label={row.imageAlt}
                className="aspect-[4/3] rounded-xl2 bg-gradient-to-br from-corner-forest/15 via-corner-stone to-corner-gold/15"
              />
              <div>
                <h3 className="font-display text-2xl font-semibold text-corner-charcoal">{row.title}</h3>
                <p className="mt-3 text-corner-muted">{row.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20">
          <p className="eyebrow">What&rsquo;s included</p>
          <h2 className="section-heading mt-3">Everything you need, nothing you don&rsquo;t</h2>
          <div className="mt-10">
            <AmenitiesGrid />
          </div>
        </div>
      </section>

      <section id="gallery" className="border-t border-corner-stone bg-corner-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="eyebrow">Gallery</p>
          <h2 className="section-heading mt-3">A closer look</h2>
          <div className="mt-10">
            <Gallery images={GALLERY_IMAGES} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <p className="eyebrow text-center">What guests say</p>
        <h2 className="section-heading mt-3 text-center">Kind words from past stays</h2>
        <div className="mt-10">
          <Testimonials testimonials={TESTIMONIALS} />
        </div>
      </section>

      <section id="faq" className="border-t border-corner-stone bg-corner-white">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <p className="eyebrow text-center">FAQ</p>
          <h2 className="section-heading mt-3 text-center">Frequently asked questions</h2>
          <div className="mt-10">
            <FAQ />
          </div>
        </div>
      </section>

      <section id="policies" className="mx-auto max-w-3xl px-6 py-20">
        <p className="eyebrow text-center">Good to know</p>
        <h2 className="section-heading mt-3 text-center">Policies</h2>
        <div className="mt-10">
          <PolicyAccordion />
        </div>
      </section>

      <Newsletter />

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="section-heading">Ready to book your stay?</h2>
        <p className="mx-auto mt-3 max-w-md text-corner-muted">
          Minimum {bookingRules.minNights}-night stay. We review every request personally.
        </p>
        <ButtonLink href="/book" variant="primary" size="lg" className="mt-6">
          Check availability
        </ButtonLink>
      </section>
    </div>
  );
}

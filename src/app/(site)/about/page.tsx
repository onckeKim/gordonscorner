import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ButtonLink } from '@/components/ui/Button';
import { siteConfig } from '@/lib/config';
import { getContentSection } from '@/lib/content/store';
import {
  aboutContentDefaults,
  propertyContentDefaults,
  type AboutContentSection,
  type PropertyContentSection,
} from '@/lib/content/sections';
import { resolvePageSeo } from '@/lib/seo/page-overrides';

export async function generateMetadata(): Promise<Metadata> {
  return resolvePageSeo({
    path: '/about',
    title: 'About',
    description: `The story behind ${siteConfig.propertyName}, a boutique self-catering retreat in ${siteConfig.address}.`,
  });
}

export default async function AboutPage() {
  const [about, property] = await Promise.all([
    getContentSection<AboutContentSection>('about', aboutContentDefaults),
    getContentSection<PropertyContentSection>('property', propertyContentDefaults),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ name: 'About', path: '/about' }]} />
      <section className="border-b border-corner-stone">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="eyebrow">Our story</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-corner-charcoal sm:text-5xl">
            About {siteConfig.propertyName}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-corner-muted">{about.story}</p>
        </div>
      </section>

      <section className="border-b border-corner-stone bg-corner-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
          <div
            role="img"
            aria-label="Gordon's Corner property, exterior detail"
            className="aspect-[4/3] rounded-xl2 bg-gradient-to-br from-corner-forest/15 via-corner-stone to-corner-gold/15"
          />
          <div>
            <p className="eyebrow">Our philosophy</p>
            <h2 className="section-heading mt-3">Less, but better</h2>
            <p className="mt-4 text-corner-muted">{about.philosophy}</p>
          </div>
        </div>
      </section>

      <section className="border-b border-corner-stone">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="eyebrow">What to expect</p>
          <h2 className="section-heading mt-3">Every stay, without compromise</h2>
          <ul className="mt-8 space-y-4">
            {about.whatGuestsCanExpect.map((item) => (
              <li key={item} className="flex items-start gap-3 text-corner-charcoal">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-corner-gold" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-b border-corner-stone bg-corner-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="eyebrow">Your host</p>
          <div className="mt-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <span
              role="img"
              aria-label={`Portrait placeholder for ${about.hostName}`}
              className="h-20 w-20 shrink-0 rounded-full bg-gradient-to-br from-corner-forest/20 via-corner-stone to-corner-gold/20"
            />
            <div>
              <p className="font-display text-xl font-semibold text-corner-charcoal">{about.hostName}</p>
              <p className="mt-2 text-sm text-corner-muted">{about.hostBio}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="eyebrow">The area</p>
          <h2 className="section-heading mt-3">Local highlights</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {property.localHighlights.map((place) => (
              <div key={place.name} className="card">
                <h3 className="font-display text-lg font-semibold text-corner-charcoal">{place.name}</h3>
                <p className="mt-2 text-sm text-corner-muted">{place.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <ButtonLink href="/book" variant="primary" size="lg">
              Check availability
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from 'next';
import { Compass, UtensilsCrossed, Ticket, Car, CalendarDays } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { MapEmbed } from '@/components/MapEmbed';
import { ButtonLink } from '@/components/ui/Button';
import { siteConfig } from '@/lib/config';
import { getContentSection } from '@/lib/content/store';
import {
  siteContentDefaults,
  areaGuideIntroContentDefaults,
  areaAttractionsContentDefaults,
  areaRestaurantsContentDefaults,
  areaActivitiesContentDefaults,
  type SiteContentSection,
  type AreaGuideIntroSection,
  type AreaGuideEntry,
} from '@/lib/content/sections';
import { resolvePageSeo } from '@/lib/seo/page-overrides';

export async function generateMetadata(): Promise<Metadata> {
  return resolvePageSeo({
    path: '/area-guide',
    title: 'Area guide',
    description: `Attractions, restaurants, and activities near ${siteConfig.propertyName} in ${siteConfig.address} — plus transport and the best time to visit.`,
  });
}

function EntryList({ items }: { items: AreaGuideEntry[] }) {
  return (
    <ul className="mt-4 space-y-4">
      {items.map((item) => (
        <li key={item.name} className="border-t border-corner-stone pt-4 first:border-t-0 first:pt-0">
          <p className="font-medium text-corner-charcoal">{item.name}</p>
          <p className="mt-1 text-sm text-corner-muted">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}

export default async function AreaGuidePage() {
  const [site, intro, attractions, restaurants, activities] = await Promise.all([
    getContentSection<SiteContentSection>('site', siteContentDefaults),
    getContentSection<AreaGuideIntroSection>('areaGuideIntro', areaGuideIntroContentDefaults),
    getContentSection<AreaGuideEntry[]>('areaAttractions', areaAttractionsContentDefaults),
    getContentSection<AreaGuideEntry[]>('areaRestaurants', areaRestaurantsContentDefaults),
    getContentSection<AreaGuideEntry[]>('areaActivities', areaActivitiesContentDefaults),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ name: 'Area guide', path: '/area-guide' }]} />

      <section className="border-b border-corner-stone">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="eyebrow">{site.address}</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-corner-charcoal sm:text-5xl">
            {intro.introTitle}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-corner-muted">{intro.introText}</p>
          <ButtonLink href="/book" variant="primary" className="mt-8">
            Check availability
          </ButtonLink>
        </div>
      </section>

      <section>
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-2">
          <div className="card">
            <div className="flex items-center gap-2">
              <Compass aria-hidden className="h-5 w-5 text-corner-gold" />
              <h2 className="font-display text-xl font-semibold text-corner-charcoal">Attractions</h2>
            </div>
            <EntryList items={attractions} />
          </div>

          <div className="card">
            <div className="flex items-center gap-2">
              <UtensilsCrossed aria-hidden className="h-5 w-5 text-corner-gold" />
              <h2 className="font-display text-xl font-semibold text-corner-charcoal">Restaurants</h2>
            </div>
            <EntryList items={restaurants} />
          </div>

          <div className="card">
            <div className="flex items-center gap-2">
              <Ticket aria-hidden className="h-5 w-5 text-corner-gold" />
              <h2 className="font-display text-xl font-semibold text-corner-charcoal">Activities</h2>
            </div>
            <EntryList items={activities} />
          </div>

          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center gap-2">
                <Car aria-hidden className="h-5 w-5 text-corner-gold" />
                <h2 className="font-display text-xl font-semibold text-corner-charcoal">Getting here</h2>
              </div>
              <p className="mt-4 text-sm text-corner-muted">{intro.transportInfo}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2">
                <CalendarDays aria-hidden className="h-5 w-5 text-corner-gold" />
                <h2 className="font-display text-xl font-semibold text-corner-charcoal">Best time to visit</h2>
              </div>
              <p className="mt-4 text-sm text-corner-muted">{intro.bestTimeToVisit}</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 pb-16">
          <MapEmbed mapEmbedUrl={site.mapEmbedUrl} address={site.address} className="aspect-[16/9] rounded-xl2" />
        </div>
      </section>
    </div>
  );
}

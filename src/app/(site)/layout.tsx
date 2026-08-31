import type { Metadata } from 'next';
import { TopBar } from '@/components/TopBar';
import { MainNav } from '@/components/MainNav';
import { Footer } from '@/components/Footer';
import { MobileBookBar } from '@/components/MobileBookBar';
import { PromoBanner } from '@/components/PromoBanner';
import { JsonLd } from '@/components/JsonLd';
import { AnalyticsScripts } from '@/components/AnalyticsScripts';
import { getContentSection } from '@/lib/content/store';
import {
  promoContentDefaults,
  socialContentDefaults,
  testimonialsContentDefaults,
  type PromoContentSection,
  type SocialContentSection,
} from '@/lib/content/sections';
import type { TestimonialEntry } from '@/lib/content/testimonials';
import { getSettings } from '@/lib/settings';
import { lodgingBusinessJsonLd, websiteJsonLd, organizationJsonLd } from '@/lib/seo';

// Every page under this layout reads admin-editable content_sections at
// request time (the site's copy is a CMS now, not build-time constants) —
// force dynamic rendering so a content edit in /admin/content shows up
// immediately instead of being frozen into a build-time static page.
export const dynamic = 'force-dynamic';

/** Merges with the root layout's metadata — adds the Google Search Console verification tag once an admin sets it at /admin/seo. */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return settings.gsc_verification_code ? { verification: { google: settings.gsc_verification_code } } : {};
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [promo, social, testimonials, settings] = await Promise.all([
    getContentSection<PromoContentSection>('promo', promoContentDefaults),
    getContentSection<SocialContentSection>('social', socialContentDefaults),
    getContentSection<TestimonialEntry[]>('testimonials', testimonialsContentDefaults),
    getSettings(),
  ]);
  const socialLinks = [social.instagram, social.facebook, social.tiktok].filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col pb-20 lg:pb-0">
      <JsonLd data={lodgingBusinessJsonLd(settings, testimonials)} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd data={organizationJsonLd(socialLinks)} />
      <AnalyticsScripts settings={settings} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-corner-gold focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>
      <PromoBanner promo={promo} />
      <TopBar />
      <MainNav />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <MobileBookBar />
    </div>
  );
}

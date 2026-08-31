import { siteConfig, propertyDetails, pricingConfig, bookingRules } from '@/lib/config';
import type { Settings, BlogPost } from '@/types/database';
import type { TestimonialEntry } from '@/lib/content/testimonials';

/**
 * Central SEO defaults — every page's metadata and the site-wide
 * structured-data block derive from here, so a rebrand or copy change only
 * needs to happen once. See src/app/layout.tsx (site-wide defaults),
 * src/app/sitemap.ts, src/app/robots.ts, and each page's `metadata` export.
 */

export const defaultMetaDescription = `${siteConfig.propertyName} is a boutique self-catering short-stay retreat in ${siteConfig.address}, sleeping up to ${propertyDetails.maxGuests} guests. Check availability and book securely online with a deposit.`;

/** Absolute URL for a site-relative path, for canonical/OG tags. */
export function absoluteUrl(path: string): string {
  return new URL(path, siteConfig.siteUrl).toString();
}

/** Only include fields Google/schema.org actually want present — omit rather than emit an empty/placeholder value. */
function withoutUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/**
 * schema.org LodgingBusiness structured data (LodgingBusiness is itself a
 * subtype of LocalBusiness — a separate LocalBusiness block would be
 * redundant/conflicting, so this one type covers both) — the standard type
 * search engines use to understand short-stay/holiday-let accommodation
 * (name, address, phone, price range, amenities, geo, reviews once real
 * ones exist). Rendered once, site-wide, by the (site) route group layout
 * via <JsonLd>. Accepts the live `settings` row so admin-configured geo
 * coordinates / Google Business Profile URL / service area flow straight
 * into structured data — every field is optional and simply omitted until
 * configured. See: https://schema.org/LodgingBusiness
 */
export function lodgingBusinessJsonLd(settings?: Pick<Settings, 'latitude' | 'longitude' | 'google_business_profile_url' | 'service_area'> | null, testimonials: TestimonialEntry[] = []) {
  return withoutUndefined({
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: siteConfig.propertyName,
    description: siteConfig.description,
    url: siteConfig.siteUrl,
    telephone: siteConfig.contactPhone,
    email: siteConfig.contactEmail,
    image: absoluteUrl('/opengraph-image'),
    address: {
      '@type': 'PostalAddress',
      streetAddress: siteConfig.addressLine1,
      addressLocality: siteConfig.addressLine2,
      addressCountry: siteConfig.addressCountry,
    },
    geo:
      settings?.latitude != null && settings?.longitude != null
        ? { '@type': 'GeoCoordinates', latitude: settings.latitude, longitude: settings.longitude }
        : undefined,
    sameAs: settings?.google_business_profile_url ? [settings.google_business_profile_url] : undefined,
    areaServed: settings?.service_area ?? undefined,
    priceRange: `${pricingConfig.standardNightlyRateZar}–${pricingConfig.weekendNightlyRateZar ?? pricingConfig.standardNightlyRateZar} ${bookingRules.currency}`,
    numberOfRooms: propertyDetails.bedrooms,
    petsAllowed: false,
    checkinTime: propertyDetails.checkInTime,
    checkoutTime: propertyDetails.checkOutTime,
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Bedrooms', value: propertyDetails.bedrooms },
      { '@type': 'LocationFeatureSpecification', name: 'Bathrooms', value: propertyDetails.bathrooms },
      { '@type': 'LocationFeatureSpecification', name: 'Max guests', value: propertyDetails.maxGuests },
    ],
    aggregateRating: aggregateRatingValue(testimonials),
    review: reviewJsonLdList(testimonials),
  });
}

/**
 * schema.org WebSite — identifies the site as a whole. `potentialAction`
 * (the "sitelinks searchbox" SearchAction) is only included once the site
 * actually has a working search endpoint to point at — see /search
 * (src/app/(site)/search/page.tsx, searches blog posts). Google explicitly
 * warns against declaring a SearchAction with no real search behind it.
 */
export function websiteJsonLd(hasSearch = true) {
  return withoutUndefined({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.propertyName,
    url: siteConfig.siteUrl,
    potentialAction: hasSearch
      ? {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${siteConfig.siteUrl}/search?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        }
      : undefined,
  });
}

/** schema.org Organization — the operating business behind the listing, distinct from the LodgingBusiness (the property itself). */
export function organizationJsonLd(socialLinks: string[] = []) {
  return withoutUndefined({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.propertyName,
    url: siteConfig.siteUrl,
    logo: absoluteUrl('/icon'),
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: siteConfig.contactPhone,
      email: siteConfig.contactEmail,
      contactType: 'customer service',
    },
    sameAs: socialLinks.length > 0 ? socialLinks : undefined,
  });
}

/** schema.org BreadcrumbList — pass the trail from home to the current page, home included. See src/components/Breadcrumbs.tsx. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** schema.org FAQPage — pass the exact Q&A pairs actually rendered on the page (never markup hidden/different content than what's visible, per Google's guidelines). */
export function faqPageJsonLd(items: { question: string; answer: string }[]) {
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/** schema.org ImageObject — for gallery/blog images that warrant their own structured data (caption + license-free assumption is NOT asserted, kept minimal). */
export function imageObjectJsonLd(url: string, opts: { caption?: string; width?: number; height?: number } = {}) {
  return withoutUndefined({
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: absoluteUrl(url),
    caption: opts.caption,
    width: opts.width,
    height: opts.height,
  });
}

/** schema.org BlogPosting/Article/NewsArticle, driven by the post's own `schema_type` field (admin-editable, see /admin/blog). */
export function blogPostingJsonLd(post: BlogPost) {
  return withoutUndefined({
    '@context': 'https://schema.org',
    '@type': post.schema_type,
    headline: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || undefined,
    image: post.social_image_url ? absoluteUrl(post.social_image_url) : absoluteUrl('/opengraph-image'),
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    author: post.author_name ? { '@type': 'Person', name: post.author_name } : { '@type': 'Organization', name: siteConfig.propertyName },
    publisher: { '@type': 'Organization', name: siteConfig.propertyName, logo: { '@type': 'ImageObject', url: absoluteUrl('/icon') } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(`/blog/${post.slug}`) },
  });
}

/**
 * schema.org Review nodes — only for testimonials that carry a real,
 * explicitly-given `rating` (see TestimonialEntry). Never fabricates a
 * star rating: an empty array here (the default, until real reviews with
 * ratings are collected) means no review markup is emitted at all, which
 * is correct — Google's guidelines treat undisclosed/fake review markup as
 * a manual-action risk.
 */
function reviewJsonLdList(testimonials: TestimonialEntry[]) {
  const rated = testimonials.filter((t): t is TestimonialEntry & { rating: number } => typeof t.rating === 'number');
  if (rated.length === 0) return undefined;
  return rated.map((t) => ({
    '@type': 'Review',
    reviewBody: t.quote,
    author: { '@type': 'Person', name: t.author },
    reviewRating: { '@type': 'Rating', ratingValue: t.rating, bestRating: 5, worstRating: 1 },
  }));
}

function aggregateRatingValue(testimonials: TestimonialEntry[]) {
  const rated = testimonials.filter((t): t is TestimonialEntry & { rating: number } => typeof t.rating === 'number');
  if (rated.length === 0) return undefined;
  const average = rated.reduce((sum, t) => sum + t.rating, 0) / rated.length;
  return {
    '@type': 'AggregateRating',
    ratingValue: Math.round(average * 10) / 10,
    reviewCount: rated.length,
    bestRating: 5,
    worstRating: 1,
  };
}

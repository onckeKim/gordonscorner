import { siteConfig, propertyDetails, pricingConfig, bookingRules } from '@/lib/config';

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

/**
 * schema.org LodgingBusiness structured data — the standard type search
 * engines use to understand short-stay/holiday-let accommodation (name,
 * address, phone, price range, amenities). Rendered once, site-wide, by
 * the (site) route group layout via <JsonLd>. See:
 * https://schema.org/LodgingBusiness
 */
export function lodgingBusinessJsonLd() {
  return {
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
  };
}

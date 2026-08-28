import { siteConfig } from '@/lib/config';
import { propertyIntro, amenities, houseFeatures, accessibilityInfo, parkingInfo, safetyInfo, locationSummary, localHighlights } from './property';
import { faqGroups, type FaqGroup } from './faq';
import { policies, type PolicyEntry } from './policies';
import { galleryPhotos, type GalleryPhoto } from './gallery';
import { aboutStory, propertyPhilosophy, whatGuestsCanExpect, hostIntro } from './about';
import { contactIntro, checkInSupportInfo } from './contact';
import { testimonials, type TestimonialEntry } from './testimonials';
import type { AmenityIconKey } from './property';
import {
  bookingPolicyDefaults,
  cancellationPolicyDefaults,
  houseRulesDefaults,
  damagesSecurityDefaults,
  privacyDefaults,
  type BookingPolicySection,
  type CancellationPolicySection,
  type PolicyItem,
} from './policy-sections';

export type { BookingPolicySection, CancellationPolicySection, CancellationTier, PolicyItem } from './policy-sections';
export { POLICY_VERSION } from './policy-sections';

/**
 * Every content_sections key the admin Content page can edit, paired with
 * its shape and its static default (pulled straight from the existing
 * src/lib/content/*.ts modules, which is what every page still renders
 * until an admin actually edits something in the DB).
 */

export interface SiteContentSection {
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  address: string;
  addressLine1: string;
  addressLine2: string;
  addressCountry: string;
  mapEmbedUrl: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export const siteContentDefaults: SiteContentSection = {
  tagline: siteConfig.tagline,
  description: siteConfig.description,
  contactEmail: siteConfig.contactEmail,
  contactPhone: siteConfig.contactPhone,
  whatsappNumber: siteConfig.whatsappNumber,
  address: siteConfig.address,
  addressLine1: siteConfig.addressLine1,
  addressLine2: siteConfig.addressLine2,
  addressCountry: siteConfig.addressCountry,
  mapEmbedUrl: siteConfig.mapEmbedUrl,
  emergencyContactName: siteConfig.emergencyContactName,
  emergencyContactPhone: siteConfig.emergencyContactPhone,
};

export interface PropertyContentSection {
  introShort: string;
  introFull: string;
  houseFeatures: string[];
  accessibilityInfo: string;
  parkingInfo: string;
  safetyInfo: string[];
  locationSummary: string;
  localHighlights: { name: string; description: string }[];
}

export const propertyContentDefaults: PropertyContentSection = {
  introShort: propertyIntro.short,
  introFull: propertyIntro.full,
  houseFeatures: [...houseFeatures],
  accessibilityInfo,
  parkingInfo,
  safetyInfo: [...safetyInfo],
  locationSummary,
  localHighlights: [...localHighlights],
};

export interface AboutContentSection {
  story: string;
  philosophy: string;
  whatGuestsCanExpect: string[];
  hostName: string;
  hostBio: string;
}

export const aboutContentDefaults: AboutContentSection = {
  story: aboutStory,
  philosophy: propertyPhilosophy,
  whatGuestsCanExpect: [...whatGuestsCanExpect],
  hostName: hostIntro.name,
  hostBio: hostIntro.bio,
};

export interface ContactContentSection {
  intro: string;
  checkInSupportInfo: string;
}

export const contactContentDefaults: ContactContentSection = {
  intro: contactIntro,
  checkInSupportInfo,
};

export type AmenityEntry = { icon: AmenityIconKey; label: string; description: string };

export const amenitiesContentDefaults: AmenityEntry[] = [...amenities];

export const policiesContentDefaults: PolicyEntry[] = [...policies];

export const faqContentDefaults: FaqGroup[] = faqGroups;

export const galleryContentDefaults: GalleryPhoto[] = [...galleryPhotos];

export const testimonialsContentDefaults: TestimonialEntry[] = [...testimonials];

export interface PromoContentSection {
  enabled: boolean;
  message: string;
  linkHref: string;
  linkLabel: string;
}

export const promoContentDefaults: PromoContentSection = {
  enabled: false,
  message: '',
  linkHref: '/book',
  linkLabel: 'Book now',
};

export interface SocialContentSection {
  instagram: string;
  facebook: string;
  whatsapp: string;
  tiktok: string;
}

export const socialContentDefaults: SocialContentSection = {
  instagram: '',
  facebook: '',
  whatsapp: '',
  tiktok: '',
};

export const bookingPolicyContentDefaults: BookingPolicySection = bookingPolicyDefaults;
export const cancellationPolicyContentDefaults: CancellationPolicySection = cancellationPolicyDefaults;
export const houseRulesContentDefaults: PolicyItem[] = houseRulesDefaults;
export const damagesSecurityContentDefaults: PolicyItem[] = damagesSecurityDefaults;
export const privacyContentDefaults: PolicyItem[] = privacyDefaults;

export const CONTENT_SECTIONS = [
  { key: 'site', label: 'Home page & contact details' },
  { key: 'property', label: 'Property description' },
  { key: 'about', label: 'About page' },
  { key: 'contact', label: 'Contact page intro' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'policies', label: 'Policies (FAQ page summary)' },
  { key: 'faq', label: 'FAQs' },
  { key: 'gallery', label: 'Gallery images' },
  { key: 'testimonials', label: 'Testimonials' },
  { key: 'promo', label: 'Promotional banner' },
  { key: 'social', label: 'Social media links' },
  { key: 'bookingPolicy', label: 'Policies page — Booking policy' },
  { key: 'cancellationPolicy', label: 'Policies page — Cancellation policy' },
  { key: 'houseRules', label: 'Policies page — House rules' },
  { key: 'damagesSecurity', label: 'Policies page — Damages & security' },
  { key: 'privacyPolicy', label: 'Policies page — Privacy' },
] as const;

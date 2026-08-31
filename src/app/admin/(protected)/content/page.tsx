import { requireRole } from '@/lib/auth/admin';
import { getContentSection } from '@/lib/content/store';
import {
  siteContentDefaults,
  propertyContentDefaults,
  aboutContentDefaults,
  contactContentDefaults,
  amenitiesContentDefaults,
  policiesContentDefaults,
  faqContentDefaults,
  galleryContentDefaults,
  testimonialsContentDefaults,
  promoContentDefaults,
  socialContentDefaults,
  bookingPolicyContentDefaults,
  cancellationPolicyContentDefaults,
  houseRulesContentDefaults,
  damagesSecurityContentDefaults,
  privacyContentDefaults,
  areaGuideIntroContentDefaults,
  areaAttractionsContentDefaults,
  areaRestaurantsContentDefaults,
  areaActivitiesContentDefaults,
  type SiteContentSection,
  type PropertyContentSection,
  type AboutContentSection,
  type ContactContentSection,
  type AmenityEntry,
  type PromoContentSection,
  type SocialContentSection,
  type BookingPolicySection,
  type CancellationPolicySection,
  type PolicyItem,
  type AreaGuideIntroSection,
  type AreaGuideEntry,
} from '@/lib/content/sections';
import type { FaqGroup } from '@/lib/content/faq';
import type { PolicyEntry } from '@/lib/content/policies';
import type { GalleryPhoto } from '@/lib/content/gallery';
import type { TestimonialEntry } from '@/lib/content/testimonials';
import { TextFieldsSection, ObjectListSection, StringListSection } from '@/components/admin/content/ContentEditors';
import { FaqEditor } from '@/components/admin/content/FaqEditor';
import { CancellationTiersEditor } from '@/components/admin/content/CancellationTiersEditor';

export default async function AdminContentPage() {
  await requireRole('admin');

  const [
    site,
    property,
    about,
    contact,
    amenities,
    policies,
    faq,
    gallery,
    testimonials,
    promo,
    social,
    bookingPolicy,
    cancellationPolicy,
    houseRules,
    damagesSecurity,
    privacyPolicy,
    areaGuideIntro,
    areaAttractions,
    areaRestaurants,
    areaActivities,
  ] = await Promise.all([
    getContentSection<SiteContentSection>('site', siteContentDefaults),
    getContentSection<PropertyContentSection>('property', propertyContentDefaults),
    getContentSection<AboutContentSection>('about', aboutContentDefaults),
    getContentSection<ContactContentSection>('contact', contactContentDefaults),
    getContentSection<AmenityEntry[]>('amenities', amenitiesContentDefaults),
    getContentSection<PolicyEntry[]>('policies', policiesContentDefaults),
    getContentSection<FaqGroup[]>('faq', faqContentDefaults),
    getContentSection<GalleryPhoto[]>('gallery', galleryContentDefaults),
    getContentSection<TestimonialEntry[]>('testimonials', testimonialsContentDefaults),
    getContentSection<PromoContentSection>('promo', promoContentDefaults),
    getContentSection<SocialContentSection>('social', socialContentDefaults),
    getContentSection<BookingPolicySection>('bookingPolicy', bookingPolicyContentDefaults),
    getContentSection<CancellationPolicySection>('cancellationPolicy', cancellationPolicyContentDefaults),
    getContentSection<PolicyItem[]>('houseRules', houseRulesContentDefaults),
    getContentSection<PolicyItem[]>('damagesSecurity', damagesSecurityContentDefaults),
    getContentSection<PolicyItem[]>('privacyPolicy', privacyContentDefaults),
    getContentSection<AreaGuideIntroSection>('areaGuideIntro', areaGuideIntroContentDefaults),
    getContentSection<AreaGuideEntry[]>('areaAttractions', areaAttractionsContentDefaults),
    getContentSection<AreaGuideEntry[]>('areaRestaurants', areaRestaurantsContentDefaults),
    getContentSection<AreaGuideEntry[]>('areaActivities', areaActivitiesContentDefaults),
  ]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Content</h1>
      <p className="mt-2 text-sm text-corner-muted">
        Edits here go live on the public site immediately. Prices, fees and check-in/out times are
        managed under <a href="/admin/settings" className="text-corner-gold hover:underline">Settings</a> instead.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TextFieldsSection
          sectionKey="site"
          title="Home page & contact details"
          initialValue={{ ...site }}
          fields={[
            { key: 'tagline', label: 'Tagline' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'contactEmail', label: 'Contact email' },
            { key: 'contactPhone', label: 'Contact phone' },
            { key: 'whatsappNumber', label: 'WhatsApp number (digits only, international format)' },
            { key: 'address', label: 'Address (short)' },
            { key: 'addressLine1', label: 'Address line 1' },
            { key: 'addressLine2', label: 'Address line 2' },
            { key: 'addressCountry', label: 'Country' },
            { key: 'mapEmbedUrl', label: 'Map embed URL' },
            { key: 'emergencyContactName', label: 'Emergency contact name (shown to confirmed guests)' },
            { key: 'emergencyContactPhone', label: 'Emergency contact phone' },
          ]}
        />

        <TextFieldsSection
          sectionKey="promo"
          title="Promotional banner"
          initialValue={{ ...promo }}
          fields={[
            { key: 'enabled', label: 'Show banner site-wide', type: 'boolean' },
            { key: 'message', label: 'Message', type: 'textarea' },
            { key: 'linkHref', label: 'Link URL' },
            { key: 'linkLabel', label: 'Link text' },
          ]}
        />

        <TextFieldsSection
          sectionKey="social"
          title="Social media links"
          initialValue={{ ...social }}
          fields={[
            { key: 'instagram', label: 'Instagram URL' },
            { key: 'facebook', label: 'Facebook URL' },
            { key: 'whatsapp', label: 'WhatsApp link' },
            { key: 'tiktok', label: 'TikTok URL' },
          ]}
        />

        <TextFieldsSection
          sectionKey="about"
          title="About page"
          initialValue={{ ...about }}
          fields={[
            { key: 'story', label: 'Story', type: 'textarea' },
            { key: 'philosophy', label: 'Philosophy', type: 'textarea' },
            { key: 'hostName', label: 'Host name' },
            { key: 'hostBio', label: 'Host bio', type: 'textarea' },
          ]}
        />

        <TextFieldsSection
          sectionKey="contact"
          title="Contact page intro"
          initialValue={{ ...contact }}
          fields={[
            { key: 'intro', label: 'Intro text', type: 'textarea' },
            { key: 'checkInSupportInfo', label: 'Check-in support info', type: 'textarea' },
          ]}
        />

        <div className="card space-y-4">
          <TextFieldsSection
            sectionKey="property"
            title="Property description"
            initialValue={{ ...property }}
            fields={[
              { key: 'introShort', label: 'Short intro', type: 'textarea' },
              { key: 'introFull', label: 'Full description', type: 'textarea' },
              { key: 'accessibilityInfo', label: 'Accessibility info', type: 'textarea' },
              { key: 'parkingInfo', label: 'Parking info', type: 'textarea' },
              { key: 'locationSummary', label: 'Location summary', type: 'textarea' },
            ]}
          />
          <StringListSection sectionKey="property" title="House features" path="houseFeatures" initialValue={property.houseFeatures} fullSection={{ ...property }} />
          <StringListSection sectionKey="property" title="Safety info" path="safetyInfo" initialValue={property.safetyInfo} fullSection={{ ...property }} />
        </div>

        <ObjectListSection
          sectionKey="amenities"
          title="Amenities"
          hint="icon must be one of: wifi, parking, aircon, kitchen, tv, laundry, braai, welcome"
          fields={[
            { key: 'icon', label: 'Icon key' },
            { key: 'label', label: 'Label' },
            { key: 'description', label: 'Description' },
          ]}
          initialValue={amenities.map((a) => ({ ...a }))}
          emptyRow={{ icon: 'welcome', label: '', description: '' }}
        />

        <ObjectListSection
          sectionKey="policies"
          title="Policies"
          fields={[
            { key: 'id', label: 'ID (unique, no spaces)' },
            { key: 'title', label: 'Title' },
            { key: 'content', label: 'Content', type: 'textarea' },
          ]}
          initialValue={policies.map((p) => ({ ...p }))}
          emptyRow={{ id: `policy-${Date.now()}`, title: '', content: '' }}
        />

        <ObjectListSection
          sectionKey="gallery"
          title="Gallery images"
          hint="category must be one of: Bedroom, Living Area, Kitchen, Bathroom, Exterior, Amenities"
          fields={[
            { key: 'src', label: 'Image URL' },
            { key: 'alt', label: 'Alt text' },
            { key: 'caption', label: 'Caption' },
            { key: 'category', label: 'Category' },
          ]}
          initialValue={gallery.map((g) => ({ ...g }))}
          emptyRow={{ src: '', alt: '', caption: '', category: 'Amenities' }}
        />

        <ObjectListSection
          sectionKey="testimonials"
          title="Testimonials"
          fields={[
            { key: 'quote', label: 'Quote', type: 'textarea' },
            { key: 'author', label: 'Author' },
            { key: 'detail', label: 'Detail (optional)' },
          ]}
          initialValue={testimonials.map((t) => ({ ...t }))}
          emptyRow={{ quote: '', author: '', detail: '' }}
        />

        <FaqEditor initialValue={faq} />
      </div>

      <h2 className="mt-10 font-display text-2xl font-semibold">Policies page</h2>
      <p className="mt-2 max-w-2xl text-sm text-corner-error">
        This is starting-point wording, not vetted legal text. The property owner must review it,
        and — for the cancellation, damages, and privacy sections especially — have it checked by
        a South African legal professional before relying on it.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <TextFieldsSection
            sectionKey="bookingPolicy"
            title="Booking policy — intro"
            initialValue={{ ...bookingPolicy }}
            fields={[{ key: 'intro', label: 'Intro', type: 'textarea' }]}
          />
          <StringListSection
            sectionKey="bookingPolicy"
            title="Booking policy — points"
            path="items"
            initialValue={bookingPolicy.items}
            fullSection={{ ...bookingPolicy }}
          />
        </div>

        <div className="card space-y-4">
          <h2 className="font-display text-lg font-semibold">Cancellation policy</h2>
          <CancellationTiersEditor section={cancellationPolicy} />
          <TextFieldsSection
            sectionKey="cancellationPolicy"
            title="Cancellation policy — details"
            initialValue={{ ...cancellationPolicy }}
            fields={[
              { key: 'guestCancellationProcedure', label: 'Guest cancellation procedure', type: 'textarea' },
              { key: 'refundEligibility', label: 'Refund eligibility', type: 'textarea' },
              { key: 'adminAndProviderCharges', label: 'Administrative/provider charges', type: 'textarea' },
              { key: 'lateCancellation', label: 'Late cancellation', type: 'textarea' },
              { key: 'noShowProcedure', label: 'No-show procedure', type: 'textarea' },
              { key: 'earlyDeparture', label: 'Early departure', type: 'textarea' },
              { key: 'cancellationByProperty', label: 'Cancellation by the property', type: 'textarea' },
              { key: 'exceptionalCircumstances', label: 'Exceptional circumstances', type: 'textarea' },
              { key: 'refundProcessingTime', label: 'Refund processing time', type: 'textarea' },
            ]}
          />
        </div>

        <ObjectListSection
          sectionKey="houseRules"
          title="House rules"
          fields={[
            { key: 'id', label: 'ID (unique, no spaces)' },
            { key: 'title', label: 'Title' },
            { key: 'content', label: 'Content', type: 'textarea' },
          ]}
          initialValue={houseRules.map((h) => ({ ...h }))}
          emptyRow={{ id: `rule-${Date.now()}`, title: '', content: '' }}
        />

        <ObjectListSection
          sectionKey="damagesSecurity"
          title="Damages & security"
          fields={[
            { key: 'id', label: 'ID (unique, no spaces)' },
            { key: 'title', label: 'Title' },
            { key: 'content', label: 'Content', type: 'textarea' },
          ]}
          initialValue={damagesSecurity.map((d) => ({ ...d }))}
          emptyRow={{ id: `damages-${Date.now()}`, title: '', content: '' }}
        />

        <ObjectListSection
          sectionKey="privacyPolicy"
          title="Privacy"
          fields={[
            { key: 'id', label: 'ID (unique, no spaces)' },
            { key: 'title', label: 'Title' },
            { key: 'content', label: 'Content', type: 'textarea' },
          ]}
          initialValue={privacyPolicy.map((p) => ({ ...p }))}
          emptyRow={{ id: `privacy-${Date.now()}`, title: '', content: '' }}
        />

        <TextFieldsSection
          sectionKey="areaGuideIntro"
          title="Area guide — intro, transport & best time to visit"
          initialValue={{ ...areaGuideIntro }}
          fields={[
            { key: 'introTitle', label: 'Intro title' },
            { key: 'introText', label: 'Intro text', type: 'textarea' },
            { key: 'transportInfo', label: 'Getting here', type: 'textarea' },
            { key: 'bestTimeToVisit', label: 'Best time to visit', type: 'textarea' },
          ]}
        />

        <ObjectListSection
          sectionKey="areaAttractions"
          title="Area guide — Attractions"
          fields={[
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ]}
          initialValue={areaAttractions.map((a) => ({ ...a }))}
          emptyRow={{ name: '', description: '' }}
        />

        <ObjectListSection
          sectionKey="areaRestaurants"
          title="Area guide — Restaurants"
          fields={[
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ]}
          initialValue={areaRestaurants.map((r) => ({ ...r }))}
          emptyRow={{ name: '', description: '' }}
        />

        <ObjectListSection
          sectionKey="areaActivities"
          title="Area guide — Activities"
          fields={[
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description', type: 'textarea' },
          ]}
          initialValue={areaActivities.map((a) => ({ ...a }))}
          emptyRow={{ name: '', description: '' }}
        />
      </div>
    </div>
  );
}

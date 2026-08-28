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
  type SiteContentSection,
  type PropertyContentSection,
  type AboutContentSection,
  type ContactContentSection,
  type AmenityEntry,
  type PromoContentSection,
  type SocialContentSection,
} from '@/lib/content/sections';
import type { FaqGroup } from '@/lib/content/faq';
import type { PolicyEntry } from '@/lib/content/policies';
import type { GalleryPhoto } from '@/lib/content/gallery';
import type { TestimonialEntry } from '@/lib/content/testimonials';
import { TextFieldsSection, ObjectListSection, StringListSection } from '@/components/admin/content/ContentEditors';
import { FaqEditor } from '@/components/admin/content/FaqEditor';

export default async function AdminContentPage() {
  await requireRole('admin');

  const [site, property, about, contact, amenities, policies, faq, gallery, testimonials, promo, social] = await Promise.all([
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
    </div>
  );
}

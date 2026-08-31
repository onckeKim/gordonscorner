import Link from 'next/link';
import { siteConfig } from '@/lib/config';
import { getContentSection } from '@/lib/content/store';
import { siteContentDefaults, socialContentDefaults, type SiteContentSection, type SocialContentSection } from '@/lib/content/sections';
import { Logo } from './Logo';

const EXPLORE_LINKS = [
  { href: '/accommodation', label: 'Accommodation' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/about', label: 'About' },
  { href: '/book', label: 'Check availability' },
];

const POLICY_LINKS = [
  { href: '/policies#cancellation', label: 'Cancellation policy' },
  { href: '/policies#house-rules', label: 'House rules' },
  { href: '/policies#privacy', label: 'Privacy' },
  { href: '/privacy-request', label: 'Request your data' },
  { href: '/contact', label: 'Contact us' },
  { href: '/booking/lookup', label: 'Find my booking' },
];

export async function Footer() {
  const [site, social] = await Promise.all([
    getContentSection<SiteContentSection>('site', siteContentDefaults),
    getContentSection<SocialContentSection>('social', socialContentDefaults),
  ]);

  const socialLinks = [
    { label: 'Instagram', href: social.instagram },
    { label: 'Facebook', href: social.facebook },
    { label: 'WhatsApp', href: social.whatsapp },
    { label: 'TikTok', href: social.tiktok },
  ].filter((s) => s.href);

  return (
    <footer className="bg-corner-forest text-corner-ivory">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo dark />
            <p className="mt-4 max-w-sm text-sm text-corner-ivory/70">{site.description}</p>
            {socialLinks.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {socialLinks.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="text-corner-ivory/85 hover:text-corner-gold">
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="eyebrow text-corner-ivory/60">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-corner-ivory/85 hover:text-corner-gold">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow text-corner-ivory/60">Policies</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {POLICY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-corner-ivory/85 hover:text-corner-gold">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-corner-ivory/15 pt-8 text-sm text-corner-ivory/70 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>{site.address}</span>
            <a href={`mailto:${site.contactEmail}`} className="hover:text-corner-gold">
              {site.contactEmail}
            </a>
            <a href={`tel:${site.contactPhone}`} className="hover:text-corner-gold">
              {site.contactPhone}
            </a>
          </div>
          <p className="text-corner-ivory/50">
            &copy; {new Date().getFullYear()} {siteConfig.propertyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

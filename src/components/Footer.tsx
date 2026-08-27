import Link from 'next/link';
import { siteConfig } from '@/lib/config';
import { Logo } from './Logo';

const EXPLORE_LINKS = [
  { href: '/#stay', label: 'The Stay' },
  { href: '/#gallery', label: 'Gallery' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/book', label: 'Check availability' },
];

const POLICY_LINKS = [
  { href: '/#policies', label: 'Cancellation policy' },
  { href: '/#policies', label: 'House rules' },
  { href: '/booking/lookup', label: 'Find my booking' },
];

export function Footer() {
  return (
    <footer className="bg-corner-forest text-corner-ivory">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo dark />
            <p className="mt-4 max-w-sm text-sm text-corner-ivory/70">{siteConfig.description}</p>
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
            <span>{siteConfig.address}</span>
            <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-corner-gold">
              {siteConfig.contactEmail}
            </a>
            <a href={`tel:${siteConfig.contactPhone}`} className="hover:text-corner-gold">
              {siteConfig.contactPhone}
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

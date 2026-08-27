import { siteConfig } from '@/lib/config';

export function Footer() {
  return (
    <footer className="border-t border-corner-border bg-corner-ink">
      <div className="mx-auto max-w-6xl px-6 py-12 text-corner-bg">
        <p className="font-display text-2xl">
          {siteConfig.propertyName}
        </p>
        <p className="mt-2 max-w-md text-sm text-corner-bg/70">{siteConfig.description}</p>
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-corner-bg/70">
          <span>{siteConfig.address}</span>
          <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-corner-bg">
            {siteConfig.contactEmail}
          </a>
          <a href={`tel:${siteConfig.contactPhone}`} className="hover:text-corner-bg">
            {siteConfig.contactPhone}
          </a>
        </div>
        <p className="mt-10 text-xs text-corner-bg/40">
          &copy; {new Date().getFullYear()} {siteConfig.propertyName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

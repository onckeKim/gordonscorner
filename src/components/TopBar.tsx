import { siteConfig, bookingRules } from '@/lib/config';

/** Narrow information strip above the main navigation. */
export function TopBar() {
  return (
    <div className="bg-corner-charcoal text-corner-ivory">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-6 py-2 text-center text-[11px] uppercase tracking-[0.15em] sm:justify-between">
        <p>
          Minimum {bookingRules.minNights}-night stay &middot; {Math.round(bookingRules.depositRate * 100)}%
          deposit secures your dates
        </p>
        <a href={`tel:${siteConfig.contactPhone}`} className="hidden hover:text-corner-gold sm:inline">
          {siteConfig.contactPhone}
        </a>
      </div>
    </div>
  );
}

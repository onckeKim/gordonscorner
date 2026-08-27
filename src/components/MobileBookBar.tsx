'use client';

import { usePathname } from 'next/navigation';
import { ButtonLink } from '@/components/ui/Button';

/**
 * Sticky "Book Now" bar shown on mobile only. Hidden on /book itself
 * (redundant with the booking form there) and on /admin (separate layout).
 * `(site)/layout.tsx` reserves matching bottom padding on <main> so this
 * never overlaps the footer or last section's content/links.
 */
export function MobileBookBar() {
  const pathname = usePathname();
  if (pathname === '/book') return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-corner-stone bg-corner-white/95 px-4 pt-3 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <ButtonLink href="/book" variant="primary" className="w-full">
        Book Now
      </ButtonLink>
    </div>
  );
}

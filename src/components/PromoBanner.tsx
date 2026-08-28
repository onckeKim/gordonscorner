import Link from 'next/link';
import type { PromoContentSection } from '@/lib/content/sections';

export function PromoBanner({ promo }: { promo: PromoContentSection }) {
  if (!promo.enabled || !promo.message) return null;

  return (
    <div className="bg-corner-gold px-6 py-2 text-center text-sm font-medium text-corner-charcoal">
      {promo.message}
      {promo.linkHref && promo.linkLabel && (
        <Link href={promo.linkHref} className="ml-2 underline hover:no-underline">
          {promo.linkLabel}
        </Link>
      )}
    </div>
  );
}

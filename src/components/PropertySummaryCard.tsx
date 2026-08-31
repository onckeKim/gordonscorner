import Image from 'next/image';
import { Users, BedDouble, Bath } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { pricingConfig, propertyDetails, siteConfig } from '@/lib/config';

interface PropertySummaryCardProps {
  imageSrc?: string;
  imageAlt: string;
  className?: string;
}

export function PropertySummaryCard({ imageSrc, imageAlt, className }: PropertySummaryCardProps) {
  const facts = [
    { icon: Users, label: `Sleeps ${propertyDetails.maxGuests}` },
    { icon: BedDouble, label: `${propertyDetails.bedrooms} bedrooms` },
    { icon: Bath, label: `${propertyDetails.bathrooms} bathroom${propertyDetails.bathrooms === 1 ? '' : 's'}` },
  ];

  return (
    <div className={`overflow-hidden rounded-xl2 border border-corner-stone bg-corner-white shadow-soft ${className ?? ''}`}>
      <div className="relative aspect-[4/3]">
        {imageSrc ? (
          <Image src={imageSrc} alt={imageAlt} fill className="object-cover" sizes="(min-width: 1024px) 40vw, 100vw" />
        ) : (
          <div
            role="img"
            aria-label={imageAlt}
            className="h-full w-full bg-gradient-to-br from-corner-forest/20 via-corner-stone to-corner-gold/15"
          />
        )}
      </div>
      <div className="p-6">
        <p className="eyebrow">Whole property</p>
        <h3 className="mt-2 font-display text-2xl font-semibold text-corner-charcoal">
          {siteConfig.propertyName}
        </h3>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-corner-muted">
          {facts.map((fact) => (
            <li key={fact.label} className="flex items-center gap-1.5">
              <fact.icon aria-hidden className="h-4 w-4 text-corner-gold" />
              {fact.label}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center justify-between border-t border-corner-stone pt-5">
          <p className="text-sm text-corner-muted">
            From{' '}
            <span className="font-display text-lg font-semibold text-corner-charcoal">
              R{pricingConfig.standardNightlyRateZar.toLocaleString('en-ZA')}
            </span>{' '}
            / night
          </p>
          <ButtonLink href="/book" variant="secondary" size="sm">
            View dates
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

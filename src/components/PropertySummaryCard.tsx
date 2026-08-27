import Image from 'next/image';
import { Users, BedDouble, Bath } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { bookingRules } from '@/lib/config';

interface Fact {
  icon: typeof Users;
  label: string;
}

const FACTS: Fact[] = [
  { icon: Users, label: 'Sleeps 4' },
  { icon: BedDouble, label: '2 bedrooms' },
  { icon: Bath, label: '1 bathroom' },
];

interface PropertySummaryCardProps {
  imageSrc?: string;
  imageAlt: string;
  className?: string;
}

export function PropertySummaryCard({ imageSrc, imageAlt, className }: PropertySummaryCardProps) {
  return (
    <div className={`overflow-hidden rounded-xl2 border border-corner-stone bg-corner-white shadow-soft ${className ?? ''}`}>
      <div className="relative aspect-[4/3]">
        {imageSrc ? (
          <Image src={imageSrc} alt={imageAlt} fill className="object-cover" />
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
          Gordon&rsquo;s Corner
        </h3>
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-corner-muted">
          {FACTS.map((fact) => (
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
              R{bookingRules.nightlyRateZar.toLocaleString('en-ZA')}
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

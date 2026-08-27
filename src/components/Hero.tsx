import Image from 'next/image';
import { ButtonLink } from '@/components/ui/Button';

interface HeroCta {
  href: string;
  label: string;
}

interface HeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
  imageSrc?: string;
  /** Always required, even for the placeholder — keeps a real photo swap alt-text-ready. */
  imageAlt: string;
}

export function Hero({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  imageSrc,
  imageAlt,
}: HeroProps) {
  return (
    <section className="border-b border-corner-stone">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
          <h1 className="font-display text-4xl font-semibold leading-[1.1] text-corner-charcoal sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {subtitle && <p className="mt-6 max-w-md text-lg text-corner-muted">{subtitle}</p>}
          {(primaryCta || secondaryCta) && (
            <div className="mt-9 flex flex-wrap gap-4">
              {primaryCta && (
                <ButtonLink href={primaryCta.href} variant="primary">
                  {primaryCta.label}
                </ButtonLink>
              )}
              {secondaryCta && (
                <ButtonLink href={secondaryCta.href} variant="secondary">
                  {secondaryCta.label}
                </ButtonLink>
              )}
            </div>
          )}
        </div>

        <div className="relative aspect-[4/5] overflow-hidden rounded-xl2 shadow-soft-lg sm:aspect-[6/5]">
          {imageSrc ? (
            <Image src={imageSrc} alt={imageAlt} fill className="object-cover" priority />
          ) : (
            <div
              role="img"
              aria-label={imageAlt}
              className="h-full w-full bg-gradient-to-br from-corner-forest/25 via-corner-stone to-corner-gold/20"
            />
          )}
        </div>
      </div>
    </section>
  );
}

import { Star } from 'lucide-react';

export interface Testimonial {
  quote: string;
  author: string;
  detail?: string;
}

function StarRating({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden
          className="h-4 w-4"
          fill={i < count ? 'currentColor' : 'none'}
          strokeWidth={1.5}
          color="rgb(180 133 45)"
        />
      ))}
    </div>
  );
}

export function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {testimonials.map((t) => (
        <figure key={t.author} className="card">
          <StarRating />
          <blockquote className="mt-4 font-display text-lg leading-snug text-corner-charcoal">
            &ldquo;{t.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-4 text-sm text-corner-muted">
            <span className="font-medium text-corner-charcoal">{t.author}</span>
            {t.detail && <> &middot; {t.detail}</>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

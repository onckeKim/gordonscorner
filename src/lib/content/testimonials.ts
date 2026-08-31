export interface TestimonialEntry {
  quote: string;
  author: string;
  detail?: string;
  /** 1–5 star rating, only if a real one was actually given — never fabricate this for Review/AggregateRating structured data (see src/lib/seo.ts). */
  rating?: number;
}

/**
 * Placeholder testimonials — deliberately generic (city-only attribution,
 * no fabricated full names) until real guest reviews are collected. Swap
 * these for genuine quotes before launch.
 */
export const testimonials: TestimonialEntry[] = [
  {
    quote: 'Every detail felt considered — quiet, warm, and exactly as described.',
    author: 'Guest, Cape Town',
  },
  {
    quote: 'The booking process was refreshingly personal. Highly recommend.',
    author: 'Guest, Johannesburg',
  },
  {
    quote: 'We’ll be back. A genuinely peaceful stay from start to finish.',
    author: 'Guest, Durban',
  },
];

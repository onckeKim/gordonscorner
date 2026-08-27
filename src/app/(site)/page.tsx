import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { siteConfig, bookingRules } from '@/lib/config';

const highlights = [
  {
    title: 'Considered spaces',
    body: 'Warm, uncluttered interiors designed for slow mornings and easy evenings.',
  },
  {
    title: 'Effortless booking',
    body: `Check real-time availability, request your dates, and secure them with a ${Math.round(bookingRules.depositRate * 100)}% deposit.`,
  },
  {
    title: 'A personal welcome',
    body: 'Every request is reviewed by hand — never an automatic yes, always a considered one.',
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-corner-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-24 lg:grid-cols-2 lg:items-center lg:py-32">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-corner-accent">
              {siteConfig.address}
            </p>
            <h1>
              <Logo size="lg" />
            </h1>
            <p className="mt-6 max-w-md text-lg text-corner-muted">{siteConfig.description}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/book" className="btn-primary">
                Check availability
              </Link>
              <Link href="#stay" className="btn-secondary">
                Explore the stay
              </Link>
            </div>
          </div>
          <div
            aria-hidden
            className="h-72 rounded-xl2 bg-gradient-to-br from-corner-accent/30 via-corner-bg to-corner-border lg:h-[420px]"
          />
        </div>
      </section>

      <section id="stay" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl font-semibold">The stay</h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {highlights.map((h) => (
            <div key={h.title} className="card">
              <h3 className="font-display text-xl font-semibold">{h.title}</h3>
              <p className="mt-2 text-sm text-corner-muted">{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="gallery" className="border-t border-corner-border bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-3xl font-semibold">Gallery</h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                className="aspect-square rounded-lg bg-gradient-to-br from-corner-border to-corner-bg"
              />
            ))}
          </div>
          <p className="mt-4 text-xs text-corner-muted">
            Placeholder gallery — swap these tiles for real photography in{' '}
            <code>src/app/(site)/page.tsx</code>.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="font-display text-3xl font-semibold">Ready to book your stay?</h2>
        <p className="mx-auto mt-3 max-w-md text-corner-muted">
          Minimum {bookingRules.minNights}-night stay. We review every request personally.
        </p>
        <Link href="/book" className="btn-primary mt-6 inline-flex">
          Check availability
        </Link>
      </section>
    </div>
  );
}

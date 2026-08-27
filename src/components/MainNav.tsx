import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { MobileNav, type NavLink } from '@/components/MobileNav';
import { ButtonLink } from '@/components/ui/Button';

const LINKS: NavLink[] = [
  { href: '/#stay', label: 'The Stay' },
  { href: '/#gallery', label: 'Gallery' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/booking/lookup', label: 'My Booking' },
];

/** Dark, muted-forest main navigation bar. */
export function MainNav() {
  return (
    <header className="sticky top-0 z-30 bg-corner-forest">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo dark />

        <nav aria-label="Primary" className="hidden items-center gap-8 sm:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-medium uppercase tracking-[0.15em] text-corner-ivory/85 transition-colors hover:text-corner-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden sm:block">
          <ButtonLink href="/book" variant="primary" size="sm">
            Check availability
          </ButtonLink>
        </div>

        <MobileNav links={LINKS} />
      </div>
    </header>
  );
}

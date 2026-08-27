import Link from 'next/link';
import { Logo } from './Logo';

export function Header() {
  return (
    <header className="border-b border-corner-border bg-corner-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-corner-ink sm:flex">
          <Link href="/#stay" className="hover:text-corner-accent">
            The Stay
          </Link>
          <Link href="/#gallery" className="hover:text-corner-accent">
            Gallery
          </Link>
          <Link href="/booking/lookup" className="hover:text-corner-accent">
            My booking
          </Link>
        </nav>
        <Link href="/book" className="btn-primary">
          Check availability
        </Link>
      </div>
    </header>
  );
}

import Link from 'next/link';

/**
 * Text-wordmark placeholder — no logo file was supplied. Swap this for an
 * <Image src="/logo.svg" .../> once the real Gordon's Corner logo asset is
 * added to /public.
 */
export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      href="/"
      className={`font-display text-2xl tracking-wide ${dark ? 'text-corner-bg' : 'text-corner-ink'}`}
    >
      <span className="font-semibold">Gordon&rsquo;s</span>{' '}
      <span className="italic">Corner</span>
    </Link>
  );
}

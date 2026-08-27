import Link from 'next/link';

/**
 * Text/CSS recreation of the Gordon's Corner wordmark (script "Gordon's"
 * over tracked "CORNER", with a rotated "EST 2024" badge) — built to match
 * the supplied business-card artwork. No image asset was ever provided to
 * this environment (only shown inline in chat, not saved to disk), so this
 * stays a live-rendered wordmark rather than a raster/SVG file. Swap for
 * <Image src="/logo.svg" .../> once the real asset file is added to
 * /public — see README "Assumptions & placeholders".
 */
export function Logo({ dark = false, size = 'sm' }: { dark?: boolean; size?: 'sm' | 'lg' }) {
  const ink = dark ? 'text-corner-bg' : 'text-corner-ink';
  const muted = dark ? 'text-corner-bg/70' : 'text-corner-muted';

  const scriptSize = size === 'lg' ? 'text-5xl sm:text-6xl' : 'text-3xl';
  const cornerSize = size === 'lg' ? 'text-base' : 'text-[11px]';
  const badgeSize = size === 'lg' ? 'text-[11px]' : 'text-[8px]';

  return (
    <Link href="/" className="group relative inline-flex flex-col items-center leading-none">
      <span className={`font-script ${scriptSize} ${ink}`}>Gordon&rsquo;s</span>
      <span className={`-mt-1 ${cornerSize} font-medium uppercase tracking-[0.45em] ${ink}`}>
        Corner
      </span>
      <span
        aria-hidden
        className={`absolute -right-8 -top-1 rotate-[18deg] uppercase tracking-[0.2em] ${badgeSize} ${muted}`}
      >
        Est&nbsp;2024
      </span>
    </Link>
  );
}

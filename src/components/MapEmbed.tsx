interface MapEmbedProps {
  mapEmbedUrl: string | null;
  address: string;
  className?: string;
}

/**
 * Renders a real Google Maps (or any provider's) iframe once an admin sets
 * `site.mapEmbedUrl` (/admin/content → Home page & contact details — Google
 * Maps → Share → Embed a map → copy the src URL). Falls back to a labelled
 * placeholder so the page never looks broken before that's configured.
 */
export function MapEmbed({ mapEmbedUrl, address, className }: MapEmbedProps) {
  if (mapEmbedUrl) {
    return (
      <iframe
        src={mapEmbedUrl}
        title={`Map showing ${address}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className={`w-full border-0 ${className ?? ''}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`Map placeholder showing ${address}`}
      className={`bg-gradient-to-br from-corner-forest/15 via-corner-stone to-corner-gold/15 ${className ?? ''}`}
    />
  );
}

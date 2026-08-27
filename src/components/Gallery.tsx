import Image from 'next/image';

export interface GalleryImage {
  src?: string;
  alt: string;
}

function GalleryTile({ src, alt, className }: GalleryImage & { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl2 ${className ?? ''}`}>
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover transition-transform duration-300 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100" />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="h-full w-full bg-gradient-to-br from-corner-stone via-corner-white to-corner-forest/10"
        />
      )}
    </div>
  );
}

/**
 * Editorial gallery grid: one featured tile plus four supporting tiles.
 * Falls back gracefully to fewer images by simply rendering what's given.
 */
export function Gallery({ images }: { images: GalleryImage[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:grid-rows-2">
      {images.slice(0, 5).map((image, i) => (
        <GalleryTile
          key={image.alt}
          {...image}
          className={i === 0 ? 'col-span-2 row-span-2 aspect-square sm:aspect-auto' : 'aspect-square'}
        />
      ))}
    </div>
  );
}

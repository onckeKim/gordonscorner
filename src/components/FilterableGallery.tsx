'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Lightbox } from '@/components/Lightbox';
import { GALLERY_CATEGORIES, type GalleryCategory, type GalleryPhoto } from '@/lib/content/gallery';

export function FilterableGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [category, setCategory] = useState<GalleryCategory>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(
    () => (category === 'All' ? photos : photos.filter((p) => p.category === category)),
    [photos, category],
  );

  return (
    <div>
      <div role="group" aria-label="Filter gallery by room" className="flex flex-wrap gap-2">
        {GALLERY_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            aria-pressed={category === cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              category === cat
                ? 'bg-corner-forest text-corner-ivory'
                : 'border border-corner-stone bg-corner-white text-corner-charcoal hover:bg-corner-ivory'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((photo, i) => (
          <button
            key={photo.alt}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="group relative aspect-square overflow-hidden rounded-xl2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-corner-gold"
            aria-label={`View larger image: ${photo.caption}`}
          >
            {photo.src ? (
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                loading="lazy"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            ) : (
              <div
                role="img"
                aria-label={photo.alt}
                className="h-full w-full bg-gradient-to-br from-corner-forest/15 via-corner-stone to-corner-gold/15"
              />
            )}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-corner-charcoal/70 to-transparent px-3 py-2 text-left text-xs text-corner-ivory opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:opacity-100">
              {photo.caption}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-corner-muted">
            No photos in this category yet.
          </p>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={filtered}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}

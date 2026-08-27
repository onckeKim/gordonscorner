'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { GalleryPhoto } from '@/lib/content/gallery';

interface LightboxProps {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/** Full-screen image viewer with keyboard navigation (Escape/Arrow keys) and focus management. */
export function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const photo = photos[index];

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        onNavigate((index - 1 + photos.length) % photos.length);
      } else if (e.key === 'ArrowRight') {
        onNavigate((index + 1) % photos.length);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [index, photos.length, onClose, onNavigate]);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Image gallery — ${photo.caption}`}
      className="fixed inset-0 z-50 flex flex-col bg-corner-charcoal/95"
    >
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <p className="text-sm text-corner-ivory/70">
          {index + 1} of {photos.length}
        </p>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className="rounded-full p-2 text-corner-ivory hover:text-corner-gold"
        >
          <X aria-hidden className="h-6 w-6" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-4 sm:px-16">
        <button
          type="button"
          onClick={() => onNavigate((index - 1 + photos.length) % photos.length)}
          aria-label="Previous image"
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-corner-ivory/10 p-2 text-corner-ivory hover:bg-corner-ivory/20 sm:left-6"
        >
          <ChevronLeft aria-hidden className="h-6 w-6" />
        </button>

        <div className="relative h-full max-h-[70vh] w-full max-w-3xl">
          {photo.src ? (
            <Image src={photo.src} alt={photo.alt} fill className="object-contain" sizes="100vw" />
          ) : (
            <div
              role="img"
              aria-label={photo.alt}
              className="flex h-full w-full items-center justify-center rounded-lg bg-gradient-to-br from-corner-forest/25 via-corner-stone/20 to-corner-gold/20"
            >
              <span className="sr-only">{photo.alt}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onNavigate((index + 1) % photos.length)}
          aria-label="Next image"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-corner-ivory/10 p-2 text-corner-ivory hover:bg-corner-ivory/20 sm:right-6"
        >
          <ChevronRight aria-hidden className="h-6 w-6" />
        </button>
      </div>

      <p className="px-6 pb-6 text-center text-sm text-corner-ivory/80">
        {photo.caption} &middot; {photo.category}
      </p>
    </div>
  );
}

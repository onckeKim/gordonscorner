import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { FilterableGallery } from '@/components/FilterableGallery';
import { getContentSection } from '@/lib/content/store';
import { galleryContentDefaults } from '@/lib/content/sections';
import type { GalleryPhoto } from '@/lib/content/gallery';
import { siteConfig } from '@/lib/config';
import { resolvePageSeo } from '@/lib/seo/page-overrides';

export async function generateMetadata(): Promise<Metadata> {
  return resolvePageSeo({
    path: '/gallery',
    title: 'Gallery',
    description: `Photos of ${siteConfig.propertyName} — interiors, exteriors, and the surrounding area in ${siteConfig.address}.`,
  });
}

export default async function GalleryPage() {
  const galleryPhotos = await getContentSection<GalleryPhoto[]>('gallery', galleryContentDefaults);

  return (
    <div>
      <Breadcrumbs items={[{ name: 'Gallery', path: '/gallery' }]} />
      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="eyebrow">Gallery</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-corner-charcoal sm:text-5xl">
          A closer look at Gordon&rsquo;s Corner
        </h1>
        <p className="mt-4 max-w-xl text-corner-muted">
          Filter by room, or browse everything. Select any photo to open it full-screen — use the
          arrow keys to move between images, and Escape to close.
        </p>
        <div className="mt-10">
          <FilterableGallery photos={galleryPhotos} />
        </div>
      </div>
    </div>
  );
}

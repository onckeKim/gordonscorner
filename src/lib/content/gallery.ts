export const GALLERY_CATEGORIES = [
  'All',
  'Bedroom',
  'Living Area',
  'Kitchen',
  'Bathroom',
  'Exterior',
  'Amenities',
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export interface GalleryPhoto {
  /** Real photo URL once available — omit to render the labelled placeholder. */
  src?: string;
  alt: string;
  caption: string;
  category: Exclude<GalleryCategory, 'All'>;
}

/** Placeholder gallery set — swap `src` in for real photography per photo. */
export const galleryPhotos: GalleryPhoto[] = [
  {
    alt: 'Main bedroom with soft cream bedding and wooden headboard',
    caption: 'Main bedroom',
    category: 'Bedroom',
  },
  {
    alt: 'Second bedroom with twin beds and reading nook',
    caption: 'Second bedroom',
    category: 'Bedroom',
  },
  {
    alt: 'Sunlit living area with linen upholstery and soft furnishings',
    caption: 'Living area',
    category: 'Living Area',
  },
  {
    alt: 'Dining nook seating four, adjoining the kitchen',
    caption: 'Dining area',
    category: 'Living Area',
  },
  {
    alt: 'Kitchen with open shelving and stone countertops',
    caption: 'Kitchen',
    category: 'Kitchen',
  },
  {
    alt: 'Close-up of kitchen coffee station and welcome basket',
    caption: 'Coffee corner',
    category: 'Kitchen',
  },
  {
    alt: 'Bathroom with freestanding tub and brass fixtures',
    caption: 'Main bathroom',
    category: 'Bathroom',
  },
  {
    alt: 'Property exterior in warm afternoon light',
    caption: 'Exterior, afternoon light',
    category: 'Exterior',
  },
  {
    alt: 'Private garden and braai area with outdoor seating',
    caption: 'Garden & braai area',
    category: 'Exterior',
  },
  {
    alt: 'Private parking bay in front of the property',
    caption: 'Private parking',
    category: 'Exterior',
  },
  {
    alt: 'Fast fibre Wi-Fi router and work-from-home nook',
    caption: 'Work-from-home nook',
    category: 'Amenities',
  },
  {
    alt: 'Smart TV and streaming setup in the living area',
    caption: 'Entertainment',
    category: 'Amenities',
  },
];

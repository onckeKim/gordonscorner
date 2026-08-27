/**
 * Editable marketing copy for the property itself — description, features,
 * accessibility/parking/safety notes, location summary.
 *
 * Centralized here (rather than scattered across page components) so a
 * future admin-dashboard "Edit site content" screen can read/write this
 * exact shape — e.g. backed by a `site_content` Supabase table keyed by
 * these same field names — without any page needing to change.
 */

export const propertyIntro = {
  short:
    "Gordon's Corner is a self-contained short-stay retreat — a calm, considered " +
    'space set up for guests who want a comfortable base without compromise.',
  full:
    "Gordon's Corner is a boutique short-stay property offering a warm, uncluttered " +
    'home away from home. Every room has been considered for comfort — from soft ' +
    'natural light in the living areas to a fully equipped kitchen for guests who ' +
    'like to cook their own meals. Whether you\'re here for a weekend reset or a ' +
    'longer stay, the property is set up to feel settled from the moment you arrive: ' +
    'fresh linen, a welcome basket, and fast Wi-Fi throughout. Outside, a private ' +
    'braai area and garden seating make the most of the Western Cape climate.',
} as const;

/** Icon keys map to lucide-react icons in components/AmenityCard.tsx — keeping
 * this as a string key (rather than the icon component itself) is what
 * makes the list safe to eventually drive from a CMS field/dropdown. */
export type AmenityIconKey =
  | 'wifi'
  | 'parking'
  | 'aircon'
  | 'kitchen'
  | 'tv'
  | 'laundry'
  | 'braai'
  | 'welcome';

export const amenities: { icon: AmenityIconKey; label: string; description: string }[] = [
  { icon: 'wifi', label: 'Fibre Wi-Fi', description: 'Fast, reliable connection throughout' },
  { icon: 'parking', label: 'Private parking', description: 'Secure, off-street bay' },
  { icon: 'aircon', label: 'Air conditioning', description: 'Climate control in every room' },
  { icon: 'kitchen', label: 'Full kitchen', description: 'Everything needed to self-cater' },
  { icon: 'tv', label: 'Smart TV', description: 'Streaming apps ready to go' },
  { icon: 'laundry', label: 'Laundry', description: 'Washer and dryer on site' },
  { icon: 'braai', label: 'Braai area', description: 'Outdoor fireplace and seating' },
  { icon: 'welcome', label: 'Welcome basket', description: 'Coffee, tea and local treats' },
];

export const houseFeatures: string[] = [
  'Open-plan living and dining area',
  'Fully equipped self-catering kitchen',
  'Private garden with braai area',
  'Dedicated work-from-home nook',
  'Linen, towels and welcome basket included',
  'Fibre Wi-Fi throughout',
];

export const accessibilityInfo =
  'Step-free access from the private parking bay to the front door and living areas. ' +
  'The main bathroom has a step-in shower with a fixed seat available on request. ' +
  'Please contact us before booking if you have specific mobility requirements so we ' +
  'can confirm the property will suit your needs.';

export const parkingInfo =
  'One secure, off-street parking bay is included, directly in front of the property. ' +
  'Additional street parking is usually available nearby.';

export const safetyInfo = [
  'Smoke and carbon monoxide detectors fitted throughout',
  'Fire extinguisher and first-aid kit in the kitchen',
  'Secure, code-locked entry',
  'External security lighting and a monitored alarm system',
];

export const locationSummary =
  "Gordon's Corner is set in a quiet residential pocket of Hermanus, an easy stroll " +
  'from the cliff path and a short drive from the town centre — close enough for ' +
  'convenience, far enough for a proper break.';

export const localHighlights = [
  { name: 'The Cliff Path', description: 'A scenic coastal walk, a few minutes on foot.' },
  { name: 'Hermanus town centre', description: 'Restaurants, galleries and shops — a short drive away.' },
  { name: 'Whale watching', description: 'Seasonal land-based whale watching along the coast (Jun–Dec).' },
  { name: 'Local markets', description: 'Weekend farmers\' markets nearby for fresh produce.' },
] as const;

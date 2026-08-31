/**
 * Local-SEO area-guide content for /area-guide — attractions, restaurants,
 * activities, transport, and best-time-to-visit copy. `attractions` reuses
 * `localHighlights` from property.ts (already real, grounded content) so
 * the two pages never drift out of sync; the rest is new, clearly-labelled
 * placeholder copy for the owner to replace with the real local area.
 */

import { localHighlights } from './property';

export interface AreaGuideEntry {
  name: string;
  description: string;
}

export const areaAttractionsDefaults: AreaGuideEntry[] = [...localHighlights];

export const areaRestaurantsDefaults: AreaGuideEntry[] = [
  { name: 'Add a real restaurant', description: 'Replace with a genuine local recommendation and a short, honest description.' },
];

export const areaActivitiesDefaults: AreaGuideEntry[] = [
  { name: 'Add a real activity', description: 'Replace with a genuine local activity and a short, honest description.' },
];

export const areaTransportInfoDefault =
  'The nearest airport is roughly 90 minutes by car; a rental car is the most practical ' +
  'way to get around the area. Replace this with real distances, airport names, and any ' +
  'shuttle/transfer options once confirmed.';

export const areaBestTimeToVisitDefault =
  'Replace with a genuine seasonal guide — e.g. which months suit outdoor activities, ' +
  'peak vs. shoulder season pricing/crowds, and any local events worth planning around.';

export const areaIntroTitleDefault = 'Discover the area';

export const areaIntroTextDefault =
  "Beyond the property itself, the surrounding area has plenty worth exploring. Here's " +
  'a short, honest guide to what\'s nearby — replace this with real, specific local ' +
  'knowledge once confirmed.';

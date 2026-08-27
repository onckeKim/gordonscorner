import type { LucideIcon } from 'lucide-react';
import {
  Wifi,
  ParkingCircle,
  Wind,
  UtensilsCrossed,
  Tv,
  WashingMachine,
  Flame,
  Coffee,
} from 'lucide-react';
import { amenities as defaultAmenities, type AmenityIconKey } from '@/lib/content/property';

const ICONS: Record<AmenityIconKey, LucideIcon> = {
  wifi: Wifi,
  parking: ParkingCircle,
  aircon: Wind,
  kitchen: UtensilsCrossed,
  tv: Tv,
  laundry: WashingMachine,
  braai: Flame,
  welcome: Coffee,
};

export interface Amenity {
  icon: AmenityIconKey;
  label: string;
  description?: string;
}

export function AmenityCard({ icon, label, description }: Amenity) {
  const Icon = ICONS[icon];
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl2 border border-corner-stone bg-corner-white p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-corner-forest/10">
        <Icon aria-hidden className="h-5 w-5 text-corner-forest" strokeWidth={1.5} />
      </span>
      <p className="font-display text-lg font-medium text-corner-charcoal">{label}</p>
      {description && <p className="text-sm text-corner-muted">{description}</p>}
    </div>
  );
}

export function AmenitiesGrid({ amenities = defaultAmenities }: { amenities?: Amenity[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {amenities.map((amenity) => (
        <AmenityCard key={amenity.label} {...amenity} />
      ))}
    </div>
  );
}

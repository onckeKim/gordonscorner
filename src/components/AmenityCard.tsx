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

export interface Amenity {
  icon: LucideIcon;
  label: string;
  description?: string;
}

export const DEFAULT_AMENITIES: Amenity[] = [
  { icon: Wifi, label: 'Fibre Wi-Fi', description: 'Fast, reliable connection throughout' },
  { icon: ParkingCircle, label: 'Private parking', description: 'Secure, off-street bay' },
  { icon: Wind, label: 'Air conditioning', description: 'Climate control in every room' },
  { icon: UtensilsCrossed, label: 'Full kitchen', description: 'Everything needed to self-cater' },
  { icon: Tv, label: 'Smart TV', description: 'Streaming apps ready to go' },
  { icon: WashingMachine, label: 'Laundry', description: 'Washer and dryer on site' },
  { icon: Flame, label: 'Braai area', description: 'Outdoor fireplace and seating' },
  { icon: Coffee, label: 'Welcome basket', description: 'Coffee, tea and local treats' },
];

export function AmenityCard({ icon: Icon, label, description }: Amenity) {
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

export function AmenitiesGrid({ amenities = DEFAULT_AMENITIES }: { amenities?: Amenity[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {amenities.map((amenity) => (
        <AmenityCard key={amenity.label} {...amenity} />
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Calendar, type DateRange } from '@/components/Calendar';

/** Browsable availability preview on the accommodation page — selecting dates here doesn't submit anything; guests continue to /book to actually request a stay. */
export function AccommodationAvailability() {
  const [range, setRange] = useState<DateRange>({ checkIn: null, checkOut: null });
  return <Calendar value={range} onChange={setRange} />;
}

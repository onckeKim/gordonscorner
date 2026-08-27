import { bookingRules } from '@/lib/config';

export interface PolicyEntry {
  id: string;
  title: string;
  content: string;
}

export const policies: PolicyEntry[] = [
  {
    id: 'cancellation',
    title: 'Cancellation policy',
    content:
      'Contact us as soon as possible if your plans change. Deposits are refundable up to 14 days before check-in; within 14 days, deposits are non-refundable but can be credited toward a future stay where possible.',
  },
  {
    id: 'house-rules',
    title: 'House rules',
    content:
      'No smoking indoors, quiet hours from 22:00 to 07:00, and pets by prior arrangement only. No parties or events. A full list is included in your confirmation email once booked.',
  },
  {
    id: 'check-in',
    title: 'Check-in & check-out',
    content:
      'Check-in from 14:00, check-out by 10:00. Early or late arrangements can usually be accommodated on request.',
  },
  {
    id: 'stay-length',
    title: 'Stay requirements',
    content: `A minimum of ${bookingRules.minNights} consecutive nights applies to all bookings.`,
  },
  {
    id: 'damages',
    title: 'Damages & security',
    content:
      'Reasonable wear and tear is expected. Guests are responsible for the cost of accidental damage beyond that; please report any issues as soon as they happen.',
  },
];

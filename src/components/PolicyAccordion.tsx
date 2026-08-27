import { Accordion, type AccordionItem } from '@/components/ui/Accordion';
import { bookingRules } from '@/lib/config';

export const DEFAULT_POLICIES: AccordionItem[] = [
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
      'No smoking indoors, quiet hours after 10pm, and pets by prior arrangement only. A full list is included in your confirmation email once booked.',
  },
  {
    id: 'check-in',
    title: 'Check-in & check-out',
    content: 'Check-in from 14:00, check-out by 10:00. Early or late arrangements can usually be accommodated on request.',
  },
  {
    id: 'stay-length',
    title: 'Stay requirements',
    content: `A minimum of ${bookingRules.minNights} consecutive nights applies to all bookings.`,
  },
];

export function PolicyAccordion({ items = DEFAULT_POLICIES }: { items?: AccordionItem[] }) {
  return <Accordion items={items} />;
}

import { Accordion, type AccordionItem } from '@/components/ui/Accordion';
import { bookingRules } from '@/lib/config';

export const DEFAULT_FAQS: AccordionItem[] = [
  {
    id: 'min-stay',
    title: 'Is there a minimum stay?',
    content: `Yes — bookings require a minimum of ${bookingRules.minNights} consecutive nights.`,
  },
  {
    id: 'deposit',
    title: 'How does the deposit work?',
    content: `Once your request is approved, we'll send a secure link to pay a ${Math.round(
      bookingRules.depositRate * 100,
    )}% deposit. Your booking is only confirmed once that deposit clears — the remaining balance is due later.`,
  },
  {
    id: 'review',
    title: 'Why isn’t booking instant?',
    content:
      'Every request is reviewed personally so we can make sure your stay goes smoothly — we typically respond within 24 hours.',
  },
  {
    id: 'cancel',
    title: 'What if I need to cancel?',
    content:
      'Get in touch as early as possible. See our cancellation policy for full details on refund timing.',
  },
];

export function FAQ({ items = DEFAULT_FAQS }: { items?: AccordionItem[] }) {
  return <Accordion items={items} />;
}

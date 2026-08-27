import { bookingRules, propertyDetails } from '@/lib/config';

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

export interface FaqGroup {
  title: string;
  items: FaqEntry[];
}

/**
 * Full FAQ set, grouped for the dedicated /faq page. The homepage preview
 * (components/FAQ.tsx) shows a shorter curated subset — see `homeFaqIds`
 * below.
 */
export const faqGroups: FaqGroup[] = [
  {
    title: 'Booking & payment',
    items: [
      {
        id: 'min-stay',
        question: 'Is there a minimum stay?',
        answer: `Yes — all bookings require a minimum of ${bookingRules.minNights} consecutive nights.`,
      },
      {
        id: 'deposit',
        question: 'How does the deposit work?',
        answer: `Once your request is approved, we'll send a secure link to pay a ${Math.round(
          bookingRules.depositRate * 100,
        )}% deposit. Your booking is only confirmed — and your dates only locked in — once that deposit clears.`,
      },
      {
        id: 'balance',
        question: 'When is the remaining balance due?',
        answer:
          'The remaining balance is payable on arrival, or earlier by arrangement — we can send a secure online link on request. We\'ll record it as settled once received.',
      },
      {
        id: 'cancellation',
        question: 'What is the cancellation policy?',
        answer:
          'Contact us as soon as your plans change. Deposits are refundable up to 14 days before check-in; within 14 days, deposits are non-refundable but can usually be credited toward a future stay.',
      },
      {
        id: 'refunds',
        question: 'How are refunds processed?',
        answer: 'Approved refunds are returned to the original payment method, typically within 5–7 business days.',
      },
    ],
  },
  {
    title: 'Your stay',
    items: [
      {
        id: 'check-in',
        question: 'What time is check-in?',
        answer: `Check-in is from ${propertyDetails.checkInTime}. Early check-in can sometimes be arranged — just ask ahead of time.`,
      },
      {
        id: 'check-out',
        question: 'What time is check-out?',
        answer: `Check-out is by ${propertyDetails.checkOutTime}. Late check-out may be available on request, subject to the next booking.`,
      },
      {
        id: 'children',
        question: 'Are children welcome?',
        answer: `Yes — children of all ages are welcome. The property sleeps up to ${propertyDetails.maxGuests} guests in total; please include children in your guest count when booking.`,
      },
      {
        id: 'visitors',
        question: 'Can guests have visitors during their stay?',
        answer:
          'Daytime visitors are welcome with prior notice. Overnight guests beyond those included in the booking should be arranged with us in advance.',
      },
      {
        id: 'pets',
        question: 'Are pets allowed?',
        answer: 'Well-behaved pets are welcome by prior arrangement only — please mention this in your booking request.',
      },
    ],
  },
  {
    title: 'House rules',
    items: [
      {
        id: 'smoking',
        question: 'Is smoking allowed?',
        answer: 'No smoking indoors. Outdoor smoking is permitted in the garden area, away from open windows.',
      },
      {
        id: 'parties',
        question: 'Are parties or events allowed?',
        answer: 'No parties or events — Gordon\'s Corner is set up for guests seeking a quiet, restful stay.',
      },
      {
        id: 'noise',
        question: 'Are there quiet hours?',
        answer: 'Quiet hours run from 22:00 to 07:00, out of consideration for neighbours.',
      },
      {
        id: 'damages',
        question: 'What happens if something gets damaged?',
        answer:
          'Accidents happen — please let us know as soon as possible. Reasonable wear and tear is expected; guests are responsible for the cost of accidental damage beyond that.',
      },
      {
        id: 'security-deposit',
        question: 'Is there a security deposit?',
        answer:
          'Not routinely — the booking deposit covers reservation of your dates. We reserve the right to request a refundable security deposit for larger groups or longer stays.',
      },
    ],
  },
  {
    title: 'Practical info',
    items: [
      {
        id: 'parking',
        question: 'Is parking available?',
        answer: 'Yes — one secure, off-street parking bay is included with every booking.',
      },
      {
        id: 'load-shedding',
        question: 'What happens during load-shedding?',
        answer:
          'The property has backup power/inverter coverage for lighting, Wi-Fi and essential outlets during scheduled load-shedding. Please check the current schedule for your stay via the Eskom Se Push app or similar.',
      },
      {
        id: 'wifi',
        question: 'Is Wi-Fi included?',
        answer: 'Yes — fast, complimentary fibre Wi-Fi is available throughout the property.',
      },
      {
        id: 'accessibility',
        question: 'Is the property wheelchair accessible?',
        answer:
          'There is step-free access from parking to the living areas, and a step-in shower with a fixed seat available on request. Please contact us before booking to confirm the property suits your specific needs.',
      },
    ],
  },
];

/** Curated subset shown in the homepage FAQ preview (components/FAQ.tsx). */
export const homeFaqIds = ['min-stay', 'deposit', 'cancellation', 'check-in'];

export const allFaqItems: FaqEntry[] = faqGroups.flatMap((group) => group.items);

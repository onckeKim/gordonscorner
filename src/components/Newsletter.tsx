import { EnquiryForm } from '@/components/EnquiryForm';

const headingId = 'newsletter-heading';

/** General enquiry section — not a marketing newsletter signup, since this
 * is a single-property booking site: a direct line to ask a question before
 * committing to a booking request is more useful here. */
export function Newsletter() {
  return (
    <section aria-labelledby={headingId} className="bg-corner-forest">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Get in touch</p>
          <h2 id={headingId} className="mt-3 font-display text-3xl font-semibold text-corner-ivory sm:text-4xl">
            Have a question before you book?
          </h2>
          <p className="mt-4 max-w-md text-corner-ivory/70">
            Send us a message and we&rsquo;ll reply personally — usually within a day.
          </p>
        </div>

        <EnquiryForm
          idPrefix="home-enquiry"
          className="rounded-xl2 bg-corner-white p-6 shadow-soft-lg sm:p-8"
        />
      </div>
    </section>
  );
}

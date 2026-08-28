# Gordon's Corner

A booking website for a short-stay property: guests check availability, request a
booking, pay a 50% deposit, and receive automatic confirmation. Admins review every
request before it can proceed.

## Stack

Next.js 14 (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres, Auth) ·
Resend (email) · PayFast (payments, pluggable) · Vercel · date-fns / date-fns-tz
(timezone-safe date math)

## Local setup

```bash
npm install
cp .env.example .env.local
```

1. Create a [Supabase](https://supabase.com) project.
2. In the SQL editor, run every file in `supabase/migrations/` **in order**
   (`0001` → `0005`) — each was validated end-to-end against a real Postgres
   instance before being committed (see "Booking engine internals" below).
3. Copy your project URL + anon key + service role key into `.env.local`
   (Settings → API).
4. Create your first admin user: Authentication → Users → Add user (email +
   password), then in the SQL editor:
   ```sql
   insert into profiles (id, email) values ('<the new user's UUID>', '<their email>');
   ```
5. Leave `RESEND_API_KEY` and `PAYMENT_PROVIDER` unset (or `PAYMENT_PROVIDER=dev`) —
   emails print to the server console and payments use the built-in simulator, so
   you can exercise the entire flow with zero external accounts.
6. `npm run dev` → http://localhost:3000. Admin is at `/admin/login`.

## Business rules (see `src/lib/config.ts`)

All business-specific values live in three exports — edit them to reconfigure the
property without touching booking logic:

- **`bookingRules`** — min stay (2 nights), max stay, deposit rate (50%), hold
  window (24h — configurable), booking lead time (24h, or `sameDayBookingEnabled`
  to bypass it), max advance booking window, currency.
- **`pricingConfig`** — standard/weekend nightly rates, optional date-ranged
  seasonal rates, cleaning fee, service fee, discount, security deposit.
- **`propertyDetails`** — max guests, bedrooms, beds, bathrooms, check-in/out times.
- `siteConfig.timeZone` — the property's IANA time zone (`Africa/Johannesburg`).
  Every "what's today / is this too soon to book" calculation is anchored to
  this, never the server's or guest's local time (see `src/lib/timezone.ts`).

## Pricing engine (`src/lib/pricing.ts`)

`calculateStayPricing(checkIn, checkOut)` resolves a rate for **every individual
night** of the stay (seasonal range match → weekend rate on Fri/Sat nights →
standard rate, in that priority) and returns the full breakdown: nightly
rate list, accommodation subtotal, cleaning fee, service fee, discount, total
accommodation price, 50% deposit, remaining balance, and a separate refundable
security deposit (not part of the deposit/balance split — collected
separately, typically on arrival). It has no server-only guard, so the same
function drives the live estimate on `/book` and the authoritative charge
`createBookingRequest` computes server-side — **the client never sends an
amount; nothing it sends can change what a guest is charged.**

## Booking statuses & workflow

```
submitted ──▶ under_review (auto, when an admin opens the request)
   │            │
   │            ├──▶ information_required ──▶ under_review (guest replies)
   │            ├──▶ alternative_dates_proposed ──▶ under_review (guest accepts)
   │            │                              └──▶ declined (guest declines)
   │            └──▶ declined (dates released)
   │
   └──▶ accepted_awaiting_deposit (dates held, deposit link emailed)
           ├──▶ expired (hold lapses unpaid → dates released)
           ├──▶ deposit_processing (guest sent to payment provider)
           │       ├──▶ confirmed (payment succeeded)
           │       └──▶ accepted_awaiting_deposit (payment failed/cancelled — retry)
           └──▶ confirmed (reference generated, dates hard-blocked, guest + admin notified)
                   ├──▶ checked_in ──▶ checked_out
                   ├──▶ no_show
                   └──▶ cancelled (dates released)
```

`draft` exists in the schema for a possible future save-and-resume form but
isn't produced by the current single-page booking flow. Balance payment
(`balance_paid_at`) is tracked as a timestamp independent of status — it
doesn't gate or change status on its own.

## Preventing double-bookings

Two layers, not one:

1. **`checkAvailability()`** (`src/lib/booking/availability.ts`) — a fast,
   friendly pre-check: min/max nights, lead time, past dates, max-advance
   window, and an overlap check against current holds/bookings/blocks. This
   is what produces a clear error message, but it's inherently racy on its
   own (two simultaneous requests can both pass it before either commits).
2. **A database EXCLUDE constraint** (`supabase/migrations/0005_prevent_double_booking.sql`)
   — `no_overlapping_active_bookings`, using `btree_gist`, rejects any INSERT
   or UPDATE that would create two overlapping date ranges among
   `accepted_awaiting_deposit` / `deposit_processing` / `confirmed` /
   `checked_in` / `checked_out` rows, regardless of application-level races.
   This was verified directly against Postgres: two concurrent "accepts" on
   overlapping dates — the second raises a real `23P01 exclusion_violation`,
   which `acceptBooking()` catches and turns into a `DoubleBookingError` the
   admin UI shows as a normal error, not a crash.

## Payment engine

The 50% deposit flow is designed around one rule: **the guest is never
charged before an admin accepts the request**, and **the booking only
becomes `confirmed` after a verified server-side webhook confirms payment**
— never from the browser redirect back from the payment provider.

```
admin accepts ─▶ dates held, deposit link emailed (accepted_awaiting_deposit)
                     │
guest opens /pay/[token] ─▶ deposit_processing ─▶ redirected to provider
                     │
provider POSTs a signed webhook to /api/payments/webhook
                     │
      ┌── signature + remote validation pass ──▶ payments row → paid
      │        │
      │        └─▶ markDepositPaid() → confirmed, receipt + admin emails sent
      │
      └── invalid / duplicate / mismatched ──▶ logged, booking status unchanged
```

**Idempotency (two layers).** Every payment attempt gets a unique
`idempotency_key` the first time a link is generated (`createPaymentLink()`
in `src/lib/payments/index.ts`) — reloading the pay page or clicking "resend"
reuses the same key rather than minting a new attempt. That key round-trips
through the provider (PayFast's `m_payment_id`/`custom_str3`) and comes back
on the webhook, so a retried delivery resolves to the same `payments` row
instead of creating a second one. Independently, `provider_reference` carries
a partial **unique index** (`payments_provider_reference_unique`,
migration `0006`) as a database-level backstop — a `23505` unique-violation
on insert is caught and treated as a duplicate, not an error, so retries are
always safe to replay.

**Webhook verification** (`src/app/api/payments/webhook/route.ts`,
`src/lib/payments/payfast.ts`) checks the ITN's MD5 signature *and* performs
PayFast's server-to-server `/eng/query/validate` round-trip before trusting
it — a browser-only "payment success" redirect is never sufficient on its
own (see `/pay/[token]/return/page.tsx`, which only ever says "we're
confirming your payment now", not that it succeeded).

**Audit trail.** `payments` (current state per attempt: type, amount,
currency via the booking, status, provider, reference, timestamps) is
paired with an append-only `payment_events` table (migration `0006`) that
logs every occurrence — webhook received, verification failed, duplicate
ignored, over/underpayment detected, manual payment recorded, refund
recorded, note added, link resent — regardless of whether it changed
anything. Nothing is ever deleted or overwritten in `payment_events`.

**Over/underpayment.** If a verified webhook's amount doesn't match the
expected deposit/balance to the cent, the payment still confirms — declining
to honour money that was genuinely received would be worse than a paperwork
mismatch — but a `payment_events` row is logged and a timestamped note is
appended to the booking's `admin_notes` for manual reconciliation.

**Payment statuses:** `pending → processing → paid`, or `failed` /
`cancelled`; a `paid` payment can later become `refunded` or
`partially_refunded` via an admin-recorded refund.

**Admin payment functions** (`src/components/admin/PaymentsPanel.tsx`,
booking detail page, and the global `/admin/payments` ledger):
- View every payment attempt for a booking, or all payments site-wide,
  with status filters.
- Re-send a deposit or balance payment link (`resendPaymentLink()` —
  reuses the same idempotency key, emails a fresh link).
- Record an EFT/manual payment (`recordManualPayment()`) — always an
  explicit admin action, always logged to `payment_events`, and this is
  also what powers the one-click "mark balance as paid" button so it
  creates a proper audit row instead of silently flipping a timestamp.
- Upload proof of payment (private Supabase Storage bucket
  `payment-proofs`; served back to admins only via short-lived signed URLs,
  never a public URL).
- Issue/record a refund (`issueRefund()`) — this **records** a refund
  already processed with the provider directly; it does not call a
  provider refund API (most merchant accounts don't expose one by
  default), which is stated in the admin UI itself.
- Add an internal note to any payment row.
- Download payment and booking records as CSV
  (`/api/admin/payments/export`, `/api/admin/bookings/export` — both
  accept `?bookingId=` to scope to one booking).

**Expired/used links.** `/pay/[token]` distinguishes three "nothing to pay"
cases with different messaging: the hold expired before payment (dates
released, guest is told to get in touch), the booking was declined/
cancelled/marked no-show (link no longer valid), and everything due is
already paid (link was already used successfully).

**Dev mode.** Without live credentials, `PAYMENT_PROVIDER=dev` (the
default) routes checkout to `/pay/simulate`, a page that lets you simulate
a paid, failed, or cancelled outcome — including resending the exact same
webhook payload to exercise duplicate-handling. See "Connecting live
services" below for switching to PayFast.

## Design system

Colors, spacing and type live as tokens, not one-off values:

- **Colors** — CSS custom properties in `src/app/globals.css` (`:root`), consumed
  through Tailwind in `tailwind.config.ts` via `rgb(var(--color-x) / <alpha-value>)`
  so opacity modifiers (`bg-corner-forest/10`) keep working. Semantic names —
  `corner-ivory`, `corner-white`, `corner-forest`, `corner-charcoal`, `corner-gold`,
  `corner-stone`, `corner-muted`, `corner-success`, `corner-warning`, `corner-error`
  — are the ones to reach for in new components. A parallel set of legacy aliases
  (`corner-bg`, `corner-ink`, `corner-accent`, `corner-border`, ...) points at the
  same tokens so every component built before this palette lands still renders
  correctly with zero changes.
- **Type** — `Fraunces` (editorial serif, headings only — `font-display`),
  `Inter` (body/forms — `font-body`), `Alex Brush` (script — reserved for the
  Gordon's Corner wordmark in `components/Logo.tsx`, never used elsewhere).
- **Components** — `src/components/ui/` holds framework-agnostic primitives
  (`Button`, `Accordion`, `Skeleton`/`SkeletonCard`/`LoadingRegion`, `EmptyState`,
  `Alert`); `src/components/` holds the site's building blocks (`TopBar`,
  `MainNav`, `MobileNav`, `Hero`, `PropertySummaryCard`, `AmenityCard`,
  `Gallery`, `Testimonials`, `FAQ`, `PolicyAccordion`, `PriceBreakdown`,
  `ConfirmationScreen`, `Newsletter`, `Footer`, `Calendar`).

Accessibility built into the tokens/primitives rather than bolted on per page:

- Global `:focus-visible` ring (`globals.css`) — every interactive element gets
  a visible keyboard focus state for free.
- `@media (prefers-reduced-motion: reduce)` collapses all animation/transition
  durations site-wide; `Skeleton` and `Gallery` hover/shimmer effects respect it
  via `motion-reduce:` variants too.
- `Calendar` is a full keyboard date grid: roving tabindex, arrow keys move by
  day, Up/Down by week, Home/End to the start/end of the week, Page Up/Down
  by month, Enter/Space to select — unavailable days stay perceivable
  (`aria-disabled`) rather than vanishing from the tab order entirely.
- `Alert` picks `role="alert"` (errors/warnings) vs `role="status"` (info/success)
  so screen readers interrupt only when something needs attention, and every
  error usage pairs a `title` with a `description` that says what to do next
  (e.g. "choose a later check-out date"), not just that something failed.
- Every image-bearing component (`Hero`, `Gallery`, `PropertySummaryCard`)
  requires an `alt`/`imageAlt` prop even before a real photo exists — the
  placeholder gradient renders with `role="img" aria-label={alt}` so alt text
  is never an afterthought once real photography is dropped in.
- Skip-to-content link at the top of `(site)/layout.tsx`; all form fields use
  real `<label htmlFor>` elements, never placeholder-as-label.

## Folder structure

```
src/
  app/
    (site)/            Public pages — see the table below
    admin/              Admin login + protected dashboard/calendar/booking detail
    api/                Route handlers (see below)
  components/           Site UI (MainNav, Hero, Gallery, Calendar, BookingForm, ...)
  components/ui/        Framework-agnostic primitives (Button, Accordion, Alert, ...)
  components/admin/     Admin-only UI (BookingActions, BlockDatesForm, ...)
  lib/
    booking/            Workflow state machine, availability checks, reference gen
    email/               Templates + Resend/dev adapters
    payments/            Provider interface + PayFast/dev adapters
    supabase/             Browser / server / service-role clients
    auth/                 requireAdmin() guard for API routes
    config.ts             ⭐ central business configuration (pricing, rules, contact)
    content/               ⭐ central editable marketing copy (see below)
  types/database.ts      Hand-written types matching the Supabase schema
supabase/migrations/     SQL schema + RLS policies, in order (0001, 0002, ...)
```

### Public pages

| Route | Purpose |
|---|---|
| `/` | Home — hero, overview, pricing, amenities, gallery preview, reviews, FAQ preview |
| `/accommodation` | Full property detail: capacity, amenities, gallery, accessibility/parking/safety, availability |
| `/gallery` | Full gallery with category filters (Bedroom/Living Area/Kitchen/Bathroom/Exterior/Amenities) and a keyboard-navigable lightbox |
| `/book` | Availability + booking request form |
| `/booking/[id]` | Guest booking status page (by id or reference) |
| `/booking/lookup` | Find a booking by reference |
| `/about` | Story, philosophy, host intro, local area |
| `/contact` | Contact form + phone/email/WhatsApp/address/map |
| `/faq` | Full FAQ (grouped) + policies |
| `/pay/[token]` | Deposit/balance payment |

### Content model

Every piece of editable marketing copy — property description, amenities,
gallery captions, FAQ answers, policies, testimonials, about-page story,
contact copy — lives in `src/lib/content/` as typed, named exports (not
scattered through page JSX). This is deliberate: a future "edit site
content" admin screen can be built as a thin layer that reads/writes a
Supabase table shaped like these same exports (e.g. `site_content` keyed by
field name) without any page component needing to change. That admin screen
itself isn't built yet — see "Assumptions & placeholders" below.

### API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/availability` | GET | Public: unavailable date ranges for the calendar |
| `/api/bookings` | POST | Public: submit a booking request |
| `/api/bookings/[id]` | GET | Public: booking status (by id or reference) |
| `/api/bookings/[id]/accept` | POST | Admin: accept + send deposit link |
| `/api/bookings/[id]/decline` | POST | Admin: decline |
| `/api/bookings/[id]/request-info` | POST | Admin: ask a question |
| `/api/bookings/[id]/propose-dates` | POST | Admin: propose alternative dates |
| `/api/bookings/[id]/respond-to-proposal` | POST | Public: guest accepts/declines proposal |
| `/api/bookings/[id]/mark-balance-paid` | POST | Admin: record balance paid |
| `/api/bookings/[id]/send-balance-link` | POST | Admin: email an online balance-payment link |
| `/api/bookings/[id]/cancel` | POST | Admin: cancel, release dates |
| `/api/bookings/[id]/check-in` | POST | Admin: mark a confirmed guest as arrived |
| `/api/bookings/[id]/check-out` | POST | Admin: mark a checked-in guest as departed |
| `/api/bookings/[id]/no-show` | POST | Admin: mark a confirmed guest as a no-show |
| `/api/payments/webhook` | POST | Provider → us: payment notification (ITN) |
| `/api/cron/expire-holds` | GET | Scheduled: release lapsed holds (see `vercel.json`) |
| `/api/admin/blocked-dates` | POST | Admin: manually block a date range |
| `/api/enquiries` | POST | Public: contact/enquiry form (`EnquiryForm`, used on home + `/contact`) → emails admin |

## Environment variables

See `.env.example` for the full list with comments. Nothing prefixed without
`NEXT_PUBLIC_` is ever sent to the browser — `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, and the PayFast credentials are read only inside server-only
modules (guarded with the `server-only` package, which fails the build if one is
ever imported from client code).

## Connecting live services

The app runs end-to-end today using development adapters (console-logged email,
simulated payments). To go live:

**Email (Resend)**
1. Create an account at [resend.com](https://resend.com), verify your sending
   domain.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` in your environment. That's it — the
   adapter in `src/lib/email/resend.ts` picks it up automatically; no code changes.

**Payments (PayFast)**
1. Create a PayFast merchant account, grab your Merchant ID/Key and set a
   passphrase (Settings → Integration).
2. Set `PAYMENT_PROVIDER=payfast`, `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`,
   `PAYFAST_PASSPHRASE`, and `PAYFAST_MODE=live` once ready (`sandbox` until then).
3. Signature verification *and* the server-to-server `/eng/query/validate`
   ITN confirmation are both already implemented in
   `src/lib/payments/payfast.ts` — no code changes needed to go live. The one
   optional extra hardening step PayFast recommends is restricting accepted
   webhook source IPs to PayFast's published ranges at your edge/firewall,
   which is infrastructure-level and outside this repo.
4. To use Peach Payments or Yoco instead, implement the `PaymentProvider`
   interface in `src/lib/payments/types.ts` (see `payfast.ts` as a template),
   register it in `src/lib/payments/index.ts`, and set `PAYMENT_PROVIDER`
   accordingly.

**Deployment (Vercel)**
1. Import the repo, set all environment variables from `.env.example`.
2. `NEXT_PUBLIC_SITE_URL` must match your production domain exactly.
3. `vercel.json` already defines the cron job that releases expired holds every
   15 minutes — Vercel enables it automatically on deploy (Hobby plan cron runs
   at most daily; use a Pro plan or an external scheduler hitting
   `/api/cron/expire-holds` for the 15-minute cadence).

## Assumptions & placeholders

- No logo file or reference screenshot was attached to the original request, so
  the header uses a text wordmark (`src/components/Logo.tsx`) and the landing
  page uses gradient placeholder tiles for photography — both clearly marked for
  swapping with real assets.
- Guest identity on the public status page (`/booking/[id]`) is the booking UUID
  or reference acting as a bearer token (the same model as the emailed link) —
  there's no separate guest login.
- Currency is fixed to ZAR (`bookingRules.currency`). Weekend/seasonal rates,
  cleaning/service fees, discounts and the security deposit are all real,
  configured line items (`pricingConfig` in `src/lib/config.ts`) — every one
  defaults to "off" (0, or `weekendNightlyRateZar: null`, or an empty
  `seasonalRates` array) until set.
- "Booking purpose" is optional on the form (`leisure`/`business`/`other`) —
  intentionally not required, since it isn't needed to process a booking and
  the brief was explicit about not collecting unnecessary personal data.
- `draft` is a valid `booking_status` value with no code path that produces
  it yet — reserved for a future save-and-resume multi-step form. Every
  other status in the enum is reachable from the current single-page flow.
- `Skeleton`/`SkeletonCard`/`LoadingRegion` and `EmptyState` (`components/ui/`)
  are built and ready but not yet wired into a specific loading/empty state on
  any page — every current data fetch either resolves fast enough server-side
  to skip a loading state, or (the client-side `Calendar` availability fetch)
  has its own inline loading text. Reach for these primitives first the next
  time a page needs one, rather than hand-rolling another loading state.
- Testimonials are clearly placeholder copy (city-only attribution, no
  fabricated full names) — edit `src/lib/content/testimonials.ts` for real
  guest quotes before launch.
- All gallery photos (`src/lib/content/gallery.ts`), the property/about/host
  copy, and every FAQ answer are realistic placeholder content — each field
  is named for exactly what it holds, so replacing it is a find-and-edit in
  `src/lib/content/`, not a redesign.
- "Additional fees" and "Discount" are real, structural line items in
  pricing (`bookingRules.additionalFeeZar` / `discountZar` in
  `src/lib/config.ts`) — both default to 0 (hidden from the price breakdown
  when zero) until a cleaning fee or promo is actually configured.
- The booking form captures adults/children counts and a required
  policy-agreement checkbox, persisted on the booking
  (`adults_count`/`children_count`/`policy_agreed_at` — see
  `supabase/migrations/0002_booking_details.sql`); the property's max-guest
  capacity (`propertyDetails.maxGuests`) is enforced server-side.
- The emergency contact number is only ever rendered on the guest's own
  confirmed booking status page (`ConfirmationScreen`), not on the public
  `/contact` page — matching "visible only to confirmed guests" without
  faking an authentication gate that doesn't otherwise exist on that page.
- WhatsApp uses a real `wa.me/<number>` deep link (no API key needed) —
  update `siteConfig.whatsappNumber` in `src/lib/config.ts`.
- The map on `/accommodation` and `/contact` is a labelled placeholder
  (`role="img" aria-label="Map placeholder..."`) until a real address is
  confirmed — set `siteConfig.mapEmbedUrl` (Google Maps → Share → Embed)
  and swap the placeholder `<div>` for an `<iframe>` once ready.

# Gordon's Corner

A booking website for a short-stay property: guests check availability, request a
booking, pay a 50% deposit, and receive automatic confirmation. Admins review every
request before it can proceed.

## Stack

Next.js 14 (App Router, TypeScript) · Tailwind CSS · Supabase (Postgres, Auth) ·
Resend (email) · PayFast (payments, pluggable) · Vercel

## Local setup

```bash
npm install
cp .env.example .env.local
```

1. Create a [Supabase](https://supabase.com) project.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
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

All business-specific values live in one file — edit it to reconfigure the property
without touching booking logic:

- Minimum stay: 2 nights (`bookingRules.minNights`)
- Deposit: 50% of the stay total (`bookingRules.depositRate`)
- Hold window: 48 hours between admin acceptance and required deposit payment
  (`bookingRules.holdExpiryHours`) — after that, dates are released automatically
- Nightly rate used for pricing (`bookingRules.nightlyRateZar`)

## Booking workflow

```
pending_review ──▶ info_requested ──▶ pending_review
      │
      ├──▶ dates_proposed ──▶ pending_review (guest accepts) / declined (guest declines)
      │
      ├──▶ declined  (dates released)
      │
      └──▶ accepted (dates held, deposit link emailed)
              ├──▶ expired (hold lapses unpaid → dates released)
              └──▶ confirmed (deposit paid → reference generated, dates blocked,
                    guest + admin notified)
                      └──▶ balance_paid (admin marks paid, or guest pays online)
```

Cancellation is available from `accepted` or `confirmed` at any time.

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
    (site)/            Public pages: landing, /book, /booking/[id], /pay/[token]
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
    config.ts             ⭐ central business configuration
  types/database.ts      Hand-written types matching the Supabase schema
supabase/migrations/     SQL schema + RLS policies
```

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
| `/api/payments/webhook` | POST | Provider → us: payment notification (ITN) |
| `/api/cron/expire-holds` | GET | Scheduled: release lapsed holds (see `vercel.json`) |
| `/api/admin/blocked-dates` | POST | Admin: manually block a date range |
| `/api/enquiries` | POST | Public: general enquiry form (`Newsletter` component) → emails admin |

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
3. Before accepting real payments, harden `src/lib/payments/payfast.ts` per the
   checklist in its header comment: re-validate each ITN against PayFast's
   `/eng/query/validate` endpoint and restrict accepted source IPs to PayFast's
   published ranges. Signature verification (already implemented) is the minimum
   bar for staging, not for production.
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
- Currency is fixed to ZAR and pricing is a flat nightly rate; seasonal/dynamic
  pricing would extend `calculateStayTotal` in `src/lib/config.ts`.
- `Skeleton`/`SkeletonCard`/`LoadingRegion` and `EmptyState` (`components/ui/`)
  are built and ready but not yet wired into a specific loading/empty state on
  any page — every current data fetch either resolves fast enough server-side
  to skip a loading state, or (the client-side `Calendar` availability fetch)
  has its own inline loading text. Reach for these primitives first the next
  time a page needs one, rather than hand-rolling another loading state.
- Testimonials on the homepage are clearly placeholder copy (city-only
  attribution, no fabricated full names) — swap `TESTIMONIALS` in
  `src/app/(site)/page.tsx` for real guest quotes before launch.

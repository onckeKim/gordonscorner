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
   (`0001` → `0012`) — each was validated end-to-end against a real Postgres
   instance before being committed (see "Booking engine internals" below).
3. Copy your project URL + anon key + service role key into `.env.local`
   (Settings → API).
4. Create your first admin user: Authentication → Users → Add user (email +
   password), then in the SQL editor:
   ```sql
   insert into profiles (id, email, role) values ('<the new user's UUID>', '<their email>', 'admin');
   ```
   `role` is `'admin'` (full access — settings, content, team, audit log) or
   `'staff'` (day-to-day bookings/calendar/payments only). Give the first
   account `admin` — see "Admin portal" below for the full RBAC picture.
5. Leave `RESEND_API_KEY` and `PAYMENT_PROVIDER` unset (or `PAYMENT_PROVIDER=dev`) —
   emails print to the server console and payments use the built-in simulator, so
   you can exercise the entire flow with zero external accounts.
6. `npm run dev` → http://localhost:3000. Admin is at `/admin/login`.

## Business rules — now admin-configurable (`src/lib/settings.ts` + `/admin/settings`)

Every operating rule listed below is a row in the DB-backed `settings` table
(migration `0007`, always exactly one row) — an admin can change any of them
from `/admin/settings` and the effect is immediate, no redeploy needed:
property name, currency, time zone, default/weekend nightly rate, deposit
percentage, min/max stay, guest capacity, booking lead time (+ same-day
toggle), max advance-booking window, temporary hold period, tax rate,
cleaning fee, service fee, security deposit, deposit/balance payment
deadlines, cancellation rules, admin notification email, check-in/out times.

`src/lib/config.ts` still holds the **static fallback defaults** (used to
seed the settings row and as a belt-and-braces fallback if it's ever
missing) — edit it only to change what a fresh database starts with, not to
reconfigure a running property. `src/lib/settings.ts:getSettings()` (cached
per-request) is what every server-side decision — pricing, availability,
hold expiry — actually reads.

## Pricing engine (`src/lib/pricing.ts`)

`calculateStayPricing(checkIn, checkOut, overrides?)` resolves a rate for
**every individual night** of the stay (date-specific/seasonal override →
weekend rate on Fri/Sat nights → standard rate, in that priority) and
returns the full breakdown: nightly rate list, accommodation subtotal,
cleaning fee, service fee, discount, tax, total accommodation price,
deposit, remaining balance, and a separate refundable security deposit (not
part of the deposit/balance split — collected separately, typically on
arrival). The optional `overrides` parameter is how live, admin-configured
values reach it: `getEffectivePricingInputs()` (`src/lib/settings.ts`)
fetches the current `settings` row and `date_rate_overrides` table and
builds it — `createBookingRequest` (the authoritative charge) always calls
this server-side; **the client never sends an amount; nothing it sends can
change what a guest is charged.** The public booking form fetches the same
live values once on mount from `/api/settings/public` for an accurate
estimate, falling back to the static `config.ts` defaults if that fails.

Seasonal/date-specific rates and per-range minimum-stay rules live in
`date_rate_overrides` (migration `0008`, editable from `/admin/calendar`) —
the first range (by creation order) covering a date wins, same precedence
the old hardcoded array used. Weekend rate is a single
`settings.weekend_nightly_rate` value (a day-of-week rule, not a range).

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

## Admin portal

The entire `/admin/*` tree is gated by `src/middleware.ts` (redirects signed-
out visitors to `/admin/login`) — nothing under it is reachable by an
ordinary site visitor.

**Login & account security**
- Email/password sign-in goes through `POST /api/admin/auth/login`
  (`src/app/api/admin/auth/login/route.ts`), a server route rather than a
  client-only `signInWithPassword()` call — this is what lets it enforce
  **repeated-failed-sign-in lockout** (`src/lib/auth/lockout.ts`: 5 failed
  attempts for one email within 15 minutes locks it for 15 minutes,
  tracked in the `login_attempts` table) *before* ever calling Supabase Auth,
  and log every attempt server-side regardless of what the client does.
- **Password reset**: `/admin/forgot-password` → Supabase's
  `resetPasswordForEmail()` → emailed link → `/admin/reset-password` →
  `updateUser({ password })`. The forgot-password page always shows the same
  confirmation regardless of whether the email exists, so it can't be used
  to enumerate admin accounts.
- **Optional TOTP multi-factor authentication**, built on Supabase Auth's
  native MFA support (no extra dependency) — enroll/verify/remove from
  `/admin/security` (`src/components/admin/MfaEnrollment.tsx`). Once
  enabled, `requireAdmin()` (`src/lib/auth/admin.ts`) and the middleware
  both check the session's authenticator assurance level and reject/redirect
  an aal1-only session (password verified, second factor not yet completed)
  from every protected page and API route — a stolen session cookie alone
  isn't enough once MFA is on.
- **Session expiration**: Supabase's own JWT expiry/refresh handles the
  absolute session lifetime; on top of that, the middleware tracks an
  `admin_last_seen` cookie and signs out + redirects to
  `/admin/login?expired=1` after `ADMIN_SESSION_IDLE_MINUTES` (default 60)
  of inactivity on `/admin/*`.
- **Role-based access control**: `profiles.role` is `'admin'` (full access)
  or `'staff'` (bookings/calendar/payments, no settings/content/team/audit
  log). `requireAdmin()` accepts either; `requireRole('admin')` gates the
  sensitive routes. Roles are managed from the "Team & roles" panel on
  `/admin/settings` (`src/app/api/admin/team/[id]/route.ts`) — an admin
  can't demote themselves if they're the last remaining admin.
- **Logout**: the sign-out button in `AdminNav` calls `supabase.auth.signOut()`.

**Dashboard** (`/admin/dashboard`) — new requests, requests awaiting review,
awaiting deposit, confirmed, upcoming check-ins/check-outs (7 days),
outstanding balances, expired payment links (including holds past
`hold_expires_at` not yet swept by the cron job), cancelled bookings, recent
payments, a 30-day occupancy percentage, confirmed/received revenue, and a
14-day calendar strip. The old dashboard's filterable booking table moved to
`/admin/bookings`.

**Booking management** (`/admin/bookings`, `/admin/bookings/[id]`) — full
detail view, accept/decline (with a reason)/request-info/propose-dates,
resend booking emails, resend deposit/balance links, cancel a confirmed
booking, record deposit/balance/refund payments, check in/out, plus this
phase's additions: a **guest communication log** (`guest_communications`
table — calls, WhatsApp, emails sent outside the automated flow), editable
**guest contact details**, **private internal notes** (`bookings.admin_notes`,
never guest-visible), **CSV export**, and a **printable/downloadable booking
summary** (`/admin/bookings/[id]/print` — open in a new tab, then the
browser's print dialog handles "Save as PDF").

**Calendar management** (`/admin/calendar`) — day/week/month views (colour:
green confirmed, gold held, grey blocked, white available), block/unblock
dates with a reason, seasonal/date-specific nightly rates and per-range
minimum-stay rules (`date_rate_overrides`, first-created-range-wins), a
weekend-rate quick edit, viewing temporary holds, and **manually creating a
booking** (phone/walk-in enquiries) that goes through the exact same
pricing/availability/double-booking-constraint path as the public form —
an admin-created booking can never silently overlap an existing one either.

**Content management** (`/admin/content`) — a small CMS: home-page text,
property description, amenities, policies, FAQs, contact details, gallery
images, promotional banner, social links, about-page copy, and testimonials
are all rows in `content_sections` (migration `0008`, key/value JSONB),
editable live and rendered immediately on the public site (`src/lib/content/store.ts:getContentSection()`
falls back to the static defaults in `src/lib/content/*.ts` for any section
an admin hasn't touched yet, so nothing needs seeding). Because public pages
now read live DB content, `src/app/(site)/layout.tsx` sets
`export const dynamic = 'force-dynamic'` — otherwise Next would freeze them
into build-time static HTML and an admin's content edit would never appear
without a full redeploy. Prices, fees, and check-in/out times are
deliberately **not** duplicated here — they're real operational settings
with one source of truth (`/admin/settings`), linked from the Content page.

**Settings** (`/admin/settings`, admin role only) — every field listed under
"Business rules" above, plus the team/role panel. **Audit log**
(`/admin/audit-log`, admin role only) — `admin_audit_log` (migration `0007`)
is an append-only table logging administrator, action, timestamp, affected
record, and a before/after diff for every settings change, content edit,
calendar rate/block change, manual booking, guest-info edit, and role
change. It's deliberately a separate, general-purpose trail from the two
domain-specific ones that already existed: `booking_status_history` (every
booking status transition, with actor + note) and `payment_events`
(every payment occurrence) — each stays scoped to its own domain rather
than duplicating into one giant table.

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

## Email system (`src/lib/email/`)

Every transactional email — 22 guest/admin events in total — is a branded,
mobile-friendly HTML document with an automatically generated plain-text
alternative, sent from server-only code, and logged to `email_log`
(migration `0009`) regardless of success or failure.

**Branding.** `src/lib/email/templates.ts:buildEmail()` wraps every email in
the site's real palette (ivory `#F5F2ED`, forest `#2F4641`, gold `#B4852D`
— see `globals.css`) and a CSS recreation of the script wordmark (`Alex
Brush`, same as the site header — no raster logo file exists yet, see
"Assumptions & placeholders"). It's a full `<!doctype html>` document with a
`viewport` meta tag and a `max-width: 600px` centered table layout, so it
reads correctly on a phone without a separate mobile template.

**Plain text.** `stripHtmlToText()` derives a real plain-text part from each
template's body HTML (converting `<a href>` to `text (url)`, list items to
`- `, etc.) rather than duplicating every template by hand — every send
therefore has both an HTML and a text/plain part.

**The 22 events** (template function → trigger):
| # | Event | Template | Trigger |
|---|---|---|---|
| 1 | Booking request received | `bookingReceivedEmail` | `createBookingRequest()` |
| 2 | New request (admin) | `adminNewRequestEmail` | `createBookingRequest()` |
| 3 | Information requested | `infoRequestedEmail` | `requestInfo()` |
| 4 | Alternative dates proposed | `datesProposedEmail` | `proposeAlternativeDates()` |
| 5 | Request accepted | `bookingAcceptedEmail` | resend-only (see below) |
| 6 | Deposit payment link | `depositLinkEmail` | `acceptBooking()` |
| 7 | Deposit reminder | `depositReminderEmail` | cron, hold >50% elapsed |
| 8 | Deposit deadline approaching | `depositDeadlineApproachingEmail` | cron, final hours of hold |
| 9 | Deposit link expired | `depositLinkExpiredEmail` | `expireStaleHolds()` |
| 10 | Payment failed | `paymentFailedEmail` | `markDepositFailed()` / webhook (balance) |
| 11 | Deposit received | `receiptEmail` (type=deposit) | payment webhook |
| 12 | Booking confirmed | `bookingConfirmedEmail` | `markDepositPaid()` |
| 13 | Booking declined | `declinedEmail` | `declineBooking()` |
| 14 | Booking cancelled | `bookingCancelledEmail` | `cancelBooking()` |
| 15 | Refund processed | `refundEmail` | `issueRefund()` |
| 16 | Balance reminder | `balanceReminderEmail` | cron, balance deadline reached |
| 17 | Balance received | `receiptEmail` (type=balance) | payment webhook / manual payment |
| 18 | Pre-arrival information | `preArrivalEmail` | cron, check-in within 7 days |
| 19 | Check-in instructions | `checkInInstructionsEmail` | cron, check-in within 1 day |
| 20 | Check-out reminder | `checkOutReminderEmail` | cron, check-out is today |
| 21 | Post-stay thank-you | `postStayThankYouEmail` | cron, check-out was yesterday |
| 22 | Review request | `reviewRequestEmail` | cron, check-out was 3 days ago |

Items 5 and 18–22 are date/state-based rather than a single action, so
they're sent by `/api/cron/send-scheduled-emails` (daily, `vercel.json`) —
each is idempotent per booking via a `*_sent_at` timestamp column added in
migration `0009`, so a retried or extra cron run never double-sends.
`bookingAcceptedEmail` is deliberately **not** auto-sent alongside the
deposit-link email (#6) — sending both back-to-back on acceptance would be
two near-identical emails seconds apart; it's available on demand instead
(see below).

**Booking confirmation email fields.** `bookingConfirmedEmail()` includes
every field the spec requires: branding, guest name, reference, status,
check-in/out dates, nights, guests, total, deposit paid, remaining balance,
the remaining-balance due date (computed server-side in `markDepositPaid()`
from `settings.balance_payment_deadline_days`), a property-address
placeholder, check-in/out times, contact details, a link to view the
booking, a link to `/policies`, and a "Next steps" list — and, like every
guest-facing template in this file, never references `booking.admin_notes`.

**Logging & delivery.** `src/lib/email/index.ts:send()` is the single choke
point every email goes through: it sends (via Resend, or the console dev
adapter when `RESEND_API_KEY` isn't set), then writes one `email_log` row
— type, recipient, booking reference, sent date, `sent`/`failed` status,
the provider's message id, and the failure reason if any — regardless of
whether the send succeeded, and never throws (a failed email must never
take down a booking-status transition).

**Admin controls.** Each booking's detail page has an "Emails" panel
(`src/components/admin/EmailPanel.tsx`) showing that booking's delivery
history and a "resend" picker covering every applicable guest email
(`resendBookingEmail()` in workflow.ts) — this is what "resend booking-
related emails" from the admin portal spec maps to; deposit/balance
payment *links* specifically are resent via the separate
`resendPaymentLink()` flow instead, since those need a freshly minted
one-time checkout session, not just a re-send of the same content.

## Policies page (`/policies`)

A single comprehensive page — booking policy, cancellation policy (with
configurable refund tiers), house rules, damages & security, and privacy —
each section backed by `content_sections` (migration `0008`/`0010`) and
editable from `/admin/content`, with static defaults in
`src/lib/content/policy-sections.ts`.

**Legal disclaimer.** Both the public page and the admin editor display a
prominent notice that this is starting-point wording, not vetted legal
text — the property owner must review it, and the cancellation/damages/
privacy sections specifically should be checked by a South African legal
professional (POPIA compliance for the privacy section in particular)
before being relied on for real bookings.

**Configurable cancellation tiers.** Rather than hardcoding a refund
percentage into prose, `cancellationPolicy.tiers` is a structured array —
`{ label, minDaysBeforeCheckIn, refundPercent }` — editable as a table from
`/admin/content` (`CancellationTiersEditor.tsx`) and rendered as a table on
the public page. The default ships with three tiers (100% / 50% / 0%
refund at 14+ / 7–13 / <7 days before check-in) but an admin can add,
remove, or change any tier without touching code.

**Consent versioning.** The booking form requires three separate,
independently unchecked checkboxes — booking policy, cancellation policy,
privacy policy — plus an unchecked-by-default (never pre-selected)
communication-consent checkbox. `POLICY_VERSION`
(`src/lib/content/policy-sections.ts`) is submitted alongside the
acceptance and stored on the booking (`bookings.policy_version`), together
with `terms_agreed_at`, `cancellation_policy_agreed_at`, and the newly
added `privacy_policy_agreed_at` (migration `0010`) — so a booking's
acceptance always points to exactly which wording of `/policies` the guest
saw, even if the page is edited later. The admin booking-detail page
displays the accepted version, timestamp, and whether communication
consent was given.

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
contact copy — has a static default in `src/lib/content/*.ts` (typed, named
exports) and a live, admin-editable override in the `content_sections` table
(`/admin/content` — see "Admin portal" above). Pages call
`getContentSection(key, staticDefault)`, so a fresh database renders
identically to before this table existed, and every edit made in the admin
UI is what guests actually see, immediately.

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

## Security, privacy & reliability

**Input validation & output safety**
- Every API route validates its body with a `zod` schema before touching the
  database — no route trusts client-supplied types or shapes.
- Every guest/admin-typed string interpolated into an HTML email is passed
  through `escapeHtml()` (`src/lib/email/templates.ts`) — names, messages,
  decline reasons, notes, enquiry text. Subject lines are plain text and
  don't need it.
- API error responses never leak raw database/provider error strings —
  `handleApiError` (`src/lib/api-response.ts`) logs the real error to the
  server console and returns a generic message to the client, even on
  admin-only routes (defense in depth).

**Authentication & authorization**
- Admin auth is Supabase Auth (email/password) with optional TOTP MFA;
  `requireAdmin()`/`requireRole()` (`src/lib/auth/admin.ts`) gate every
  admin API route and page, and `middleware.ts` enforces MFA completion and
  an idle-session timeout (`ADMIN_SESSION_IDLE_MINUTES`) separate from
  Supabase's own JWT expiry.
- Repeated-failed-login lockout is per-email (`src/lib/auth/lockout.ts`)
  *and* per-IP (`checkIpRateLimit` on `/api/admin/auth/login`) — the second
  catches an attacker spraying many different email addresses from one
  source, which the first alone wouldn't.
- RBAC: `admin` vs `staff` roles (`profiles.role`) — settings, content,
  team management, refunds and the audit log require `admin`; day-to-day
  bookings/calendar/payments only require `staff`.

**Rate limiting & spam protection**
- `POST /api/bookings`, `POST /api/enquiries`, `POST /api/privacy-requests`,
  and `POST /api/admin/auth/login` are all rate-limited by IP via an atomic
  Postgres function (`rate_limit_hit`, migration `0011`) — fixed-window,
  keyed per bucket+IP. The check **fails open** (allows the request) if the
  database is unreachable, so a rate-limiter outage can never take down
  booking submission — every protected route has other defenses behind it
  anyway (validation, idempotency, the double-booking constraint, admin
  review).
- The booking and enquiry forms carry a honeypot field (off-screen, never
  seen by a sighted or screen-reader user) plus a minimum-fill-time check.
  A bot that trips either is silently accepted-and-discarded on the
  enquiry/privacy-request forms (never reveals detection); the booking form
  returns a generic rejection instead, since its success path depends on a
  real booking id to redirect to. For stronger protection against
  determined abuse, add Cloudflare Turnstile or hCaptcha on top of this.

**Cookies & CSRF**
- Supabase auth cookies get explicit `sameSite`/`secure`/`path` floors
  (`hardenCookieOptions` in both `src/lib/supabase/server.ts` and
  `middleware.ts`) layered additively on top of whatever `@supabase/ssr`
  already sets — never overriding it. `httpOnly` is deliberately **not**
  forced on these: the browser `auth-js` client reads/refreshes the session
  via `document.cookie`, so forcing `httpOnly` would silently break
  client-side sign-out, session refresh, and the MFA/password-reset flows.
  The separate `admin_last_seen` idle-timeout cookie *is* `httpOnly` (it's
  never read by client JS).
- `sameSite=lax` on every auth cookie already blocks cross-site POST
  submission of the admin session cookie, which is the practical CSRF
  vector here; state-changing admin actions also require the signed-in
  session itself, not just a cookie's presence.

**File uploads (proof-of-payment)**
- 10MB size cap, MIME-type allowlist (JPEG/PNG/WebP/PDF), and the stored
  file's extension is taken from a fixed MIME→extension map — **never**
  from the original filename — so a crafted filename can't smuggle an
  unexpected extension onto the storage bucket
  (`src/app/api/bookings/[id]/payments/manual/route.ts`).

**Environment variables**
- `src/lib/env.ts` validates every required var with `zod` and throws one
  aggregated error listing every problem, called once from
  `instrumentation.ts`'s `register()` hook at server startup — a
  misconfigured deployment fails loudly and immediately instead of throwing
  a confusing error deep inside whichever request handler happens to touch
  the missing var first. Conditionally-required vars (PayFast credentials
  when `PAYMENT_PROVIDER=payfast`, `RESEND_API_KEY`, `CRON_SECRET`) log a
  warning instead of throwing, matching the app's "dev mode" fallback
  philosophy.

**Payments**
- PayFast webhook signature verification *and* the server-to-server ITN
  validate round-trip both happen before anything is trusted
  (`src/lib/payments/payfast.ts`).
- Duplicate webhook delivery is handled two ways: an already-processed
  `provider_reference` is recognised and acknowledged without reapplying
  anything, and a database unique-constraint violation on insert (two
  deliveries racing each other) is treated as a safe no-op, not an error.
  Both paths are covered by automated tests (see "Testing" below).
- The server always computes the price and deposit/balance amounts itself
  (`calculateStayPricing`) — nothing the client sends is ever trusted for
  an amount.

**Booking reliability** (see also "Preventing double-bookings" above)
- Minimum-nights, past-date, lead-time, max-advance-window, and
  overlap-with-existing-booking/hold/blocked-date checks all happen
  server-side in `checkAvailability()` before a booking is created, *and*
  a database-level `EXCLUDE` constraint (migration `0005`) is the real
  defence against a race between two simultaneous requests — the
  application-level check is a fast, friendly pre-check, not the only
  guard.
- A booking's dates only appear as *permanently* unavailable once it
  reaches `deposit_paid` or later — while it's `accepted_awaiting_deposit`
  or `deposit_processing`, the `public_unavailable_ranges` view (migration
  `0003`) only counts it as blocking dates while `hold_expires_at > now()`,
  and `expireStaleHolds()` (run every 15 minutes via
  `/api/cron/expire-holds`) releases the hold once it lapses — so a guest
  who never pays never permanently loses the dates for anyone else.
- Two admins acting on the same booking from stale data: every workflow
  transition re-reads the booking's current status and asserts it's in an
  allowed set before proceeding (`assertStatus` in
  `src/lib/booking/workflow.ts`) — a second, now-invalid action fails with
  a clear error rather than silently corrupting state.

**Privacy**
- `/privacy-request` (`src/app/(site)/privacy-request/page.tsx`) lets a
  guest submit a data export, correction, or deletion request, logged to
  `privacy_requests` (migration `0012`) for admin triage at
  `/admin/privacy-requests` — every status change is written to the audit
  log. Deletion isn't self-service/automatic, since bookings and payments
  carry statutory retention obligations an admin has to weigh first.
- Data minimisation: the booking form collects only what's needed to
  process a stay (no unnecessary personal data — see "Assumptions" below
  on `bookingPurpose`); admin notes and internal fields are never included
  in guest-facing emails.
- See `/policies#privacy` for the guest-facing privacy notice, and
  `settings.cancellation_policy`/the retention note in that policy for
  configuring retention language.

**Audit logging**
- `admin_audit_log` (migration `0007`) records every settings, content,
  calendar, team, and privacy-request change — actor, action, record,
  timestamp, and a diff of what changed. Booking status transitions and
  payment events have their own dedicated trails
  (`booking_status_history`, `payment_events`) for the same reason, viewed
  inline on each booking's detail page.

**Error handling**
- Guests only ever see friendly, specific messages (`WorkflowError`
  messages are written to be guest-readable); anything unexpected is
  logged server-side with full detail and reduced to a generic "Something
  went wrong" for the response (`handleApiError`). No stack trace, secret
  value, or raw database error ever reaches a public response body.

## Testing

```bash
npm test          # run once (CI-friendly)
npm run test:watch
```

Vitest, configured in `vitest.config.mts`. **What's covered by real,
passing automated tests** (86 tests across 9 files as of this writing):
- Pure business logic: pricing engine (weekend/seasonal rates, fees,
  discount, tax, deposit split, rounding), date-range math, timezone/lead
  time reasoning, booking-reference/payment-token generation, CSV export.
- Security helpers: HTML-escaping, honeypot/timing spam detection, client-IP
  extraction, rate-limit fail-open behaviour, environment-variable
  validation (every required-var-missing / malformed-URL / conditional-warn
  / caching branch).
- Booking reliability: `checkAvailability()` against a mocked settings +
  Supabase layer — min/max nights (including a seasonal min-nights
  override), past-date rejection, lead-time and max-advance-window
  enforcement, and date-range overlap detection (including the exact
  half-open-range boundary: a stay starting the day an existing range ends
  is *not* a conflict).
- Payment webhook idempotency against a mocked Supabase client: an
  already-processed `provider_reference` is acknowledged without
  reapplying anything; a unique-constraint violation on insert (concurrent
  duplicate delivery) is treated as a safe no-op; a genuine first-time paid
  deposit confirms the booking and sends exactly one receipt; a
  signature-verification failure never touches the booking.

**What's authored but not executable in every environment:** this sandbox
has no live Supabase project connected, so true integration/E2E tests
against a real database, and real-browser tests (mobile/tablet/desktop
viewport rendering, screen-reader/keyboard accessibility) could not be run
here. What stands in for them:
- Every reliability guarantee above that depends on the database (the
  `EXCLUDE` constraint, RLS policies, the `rate_limit_hit` function) was
  validated by hand against a real local Postgres instance during
  development of the relevant migration (see the git history for
  `supabase/migrations/`), not just eyeballed as SQL.
- Accessibility and responsive layout were built in from the start with
  Tailwind's mobile-first utilities (every layout is authored with `sm:`/
  `lg:` breakpoints, not retrofitted) and explicit ARIA (`aria-expanded`,
  `aria-controls`, `role="dialog"`/`role="region"`, a skip-to-content
  link, keyboard-operable disclosure widgets) — confirmed by code
  inspection, not a live browser/screen-reader pass. **Run a real
  Lighthouse/axe pass and manually test at 375px/768px/1280px+ before
  launch** — see "Production testing" below.
- Duplicate-booking-submission and end-to-end payment flows are exercised
  by the dev payment simulator (`PAYMENT_PROVIDER=dev`, `/pay/simulate`) —
  walk through it by hand once your Supabase project is live (see
  "Production testing" below for the specific scenarios to click through).

## SEO

- `src/app/layout.tsx`: site-wide metadata defaults (title template, OG/
  Twitter cards, `metadataBase`, keywords, `viewport`/`themeColor`).
- Every public page sets its own `title`/`description`/canonical
  (`export const metadata`).
- `src/app/sitemap.ts` / `src/app/robots.ts`: only genuinely public,
  indexable routes are listed (admin, API, guest-token pages like
  `/booking/[id]` and `/pay/*` are excluded).
- `src/app/opengraph-image.tsx` / `src/app/icon.tsx`: generated (no binary
  asset needed) OG image and favicon via `next/og` — swap for real
  photography/a logo once available (same "Assumptions & placeholders"
  section as everything else content-shaped).
- `src/lib/seo.ts`: `lodgingBusinessJsonLd()` — schema.org `LodgingBusiness`
  structured data (name, address, phone, price range) rendered site-wide by
  the `(site)` layout via `<JsonLd>` — this is what lets Google understand
  the site as short-stay accommodation for local search.
- All of the above reads from `siteConfig`/`propertyDetails`/`pricingConfig`
  (`src/lib/config.ts`), so correcting the address, phone number, or price
  once (per "Content checklist" below) automatically corrects every
  metadata tag and the structured data — nothing is duplicated.

## Owner content checklist

Everything below is either a placeholder value in `src/lib/config.ts` /
`src/lib/content/` or genuinely missing — the site **runs** without any of
it, but shouldn't **launch** without it:

- [ ] Property address (`siteConfig.address`/`addressLine1`/`addressLine2`)
- [ ] Contact phone number (`siteConfig.contactPhone`)
- [ ] Booking/contact email address (`siteConfig.contactEmail`,
      `ADMIN_NOTIFICATION_EMAIL`, `EMAIL_FROM`)
- [ ] WhatsApp number (`siteConfig.whatsappNumber`, digits only, intl format)
- [ ] Nightly rate (`/admin/settings` → Default nightly rate, or
      `pricingConfig.standardNightlyRateZar` for the seed default)
- [ ] Weekend rate (`/admin/settings`, or set to none for standard-rate
      weekends)
- [ ] Seasonal/date-specific rates (`/admin/calendar` → rate overrides)
- [ ] Cleaning fee (`/admin/settings`)
- [ ] Security/breakage deposit amount (`/admin/settings`)
- [ ] Maximum number of guests (`/admin/settings` → Guest capacity)
- [ ] Bedroom and bathroom counts, bed count (`propertyDetails` in
      `src/lib/config.ts`)
- [ ] Amenities list (`/admin/content` → Amenities)
- [ ] Check-in / check-out times (`/admin/settings`)
- [ ] Cancellation terms — the tiered refund schedule
      (`/admin/content` → Policies, or `src/lib/content/policy-sections.ts`
      defaults) — **have this reviewed by a local legal professional**,
      it's a real contractual term.
- [ ] Balance-payment deadline (`/admin/settings` → Balance payment
      deadline days)
- [ ] House rules, damages/security terms, privacy notice wording
      (`/admin/content` → Policies — also legal-review-worthy for POPIA
      compliance)
- [ ] Wi-Fi information — placeholder FAQ/amenity copy already exists
      (`/admin/content` → FAQ "Is Wi-Fi included?" and Amenities); confirm
      the real network details and update if it isn't in fact fibre
- [ ] Parking details — placeholder FAQ copy already exists
      (`/admin/content` → FAQ "Is parking available?"); confirm the real
      arrangement (bay count, street vs. off-street) and update
- [ ] Load-shedding information — placeholder FAQ copy already exists
      (`/admin/content` → FAQ "load-shedding"); confirm backup-power
      coverage and update
- [ ] Emergency contact name/number (`siteConfig.emergencyContactName`/
      `emergencyContactPhone` — only ever shown to confirmed guests)
- [ ] Social media links (`/admin/content` → Social — Instagram, Facebook,
      WhatsApp, TikTok; empty ones are hidden automatically, not shown broken)
- [ ] Property photographs (`/admin/content` → Gallery — paste hosted image
      URLs; see "Image storage" below for hosting them on Supabase)
- [ ] Logo file (`src/components/Logo.tsx` currently renders a text
      wordmark)
- [ ] Payment-provider account (PayFast, or another provider — see
      "Connecting live services")
- [ ] Email-service account (Resend — see "Connecting live services")
- [ ] Domain name (for `NEXT_PUBLIC_SITE_URL` and Vercel domain setup)

## Deployment guide

**1. Supabase**
1. Create a project at [supabase.com](https://supabase.com).
2. SQL editor → run every file in `supabase/migrations/` in order, `0001`
   through `0012`.
3. Settings → API: copy the Project URL, `anon` public key, and
   `service_role` secret key.
4. Storage: the `payment-proofs` bucket (private) is created automatically
   by migration `0006`. If you'll host gallery photos in Supabase rather
   than another CDN, create a **public** bucket (e.g. `gallery`) yourself —
   Storage → New bucket → toggle "Public" — then paste each uploaded
   file's public URL into `/admin/content` → Gallery.

**2. Initial administrator account**
1. Authentication → Users → Add user (email + a strong password).
2. SQL editor:
   ```sql
   insert into profiles (id, email, role)
   values ('<the new user''s UUID>', '<their email>', 'admin');
   ```
3. Sign in at `/admin/login` and enroll MFA (Security page) — strongly
   recommended before the portal is reachable on a public domain.

**3. Payment provider** — see "Connecting live services" above for PayFast
   setup and the `PaymentProvider` interface if using a different provider.

**4. Transactional email (Resend)** — see "Connecting live services" above.

**5. Environment variables** — set every var from `.env.example` in your
   hosting provider's dashboard (Vercel → Project → Settings →
   Environment Variables). `NEXT_PUBLIC_SITE_URL` must exactly match your
   production domain (no trailing slash) — it's used to build every email
   link and payment return/notify URL. Generate `CRON_SECRET` with
   `openssl rand -hex 32`.

**6. Vercel deployment**
1. Import the repository, framework preset "Next.js" (auto-detected).
2. Add the environment variables from step 5.
3. Deploy. `vercel.json` already defines both cron jobs (`expire-holds`
   every 15 minutes, `send-scheduled-emails` daily) — Vercel wires them up
   automatically and (with `CRON_SECRET` set) sends the required
   `Authorization: Bearer $CRON_SECRET` header itself, no extra config.
   The 15-minute cadence needs a Pro plan or higher (Hobby cron runs at
   most once daily) — if staying on Hobby, point an external scheduler
   (e.g. cron-job.org) at `/api/cron/expire-holds` instead.

**7. Domain & SSL**
1. Vercel → Project → Settings → Domains → add your domain, follow the DNS
   instructions (A/CNAME record at your registrar).
2. Vercel issues and renews the SSL certificate automatically — no action
   needed once DNS propagates.
3. Update `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy if it
   was set to a placeholder earlier.

**8. Webhook configuration**
- PayFast (or your chosen provider) needs your live ITN/webhook URL:
  `https://<your-domain>/api/payments/webhook`. Set this in the provider's
  dashboard once your domain is live — it's already implemented and
  requires no code changes (see "Connecting live services").

**9. Production testing** — before announcing the site live, click through
   each of these once against the real Supabase project (with
   `PAYMENT_PROVIDER=dev` first, then again with the real provider in
   sandbox/test mode):
   - Submit a booking request for a valid date range → confirm it appears
     in `/admin/bookings`.
   - Try to submit a 1-night booking, a past date, and a date range
     overlapping an existing/held booking → each should be rejected with a
     clear message.
   - Accept the request as admin → confirm the deposit-link email sends
     (check `/admin/bookings/[id]` email history) and the dates show as
     "held" (not yet "confirmed") on the public calendar.
   - Pay the deposit (simulator or provider sandbox) → confirm the booking
     flips to confirmed, the dates show as blocked on the public calendar,
     and a receipt email sends.
   - Let a hold expire (or manually set `hold_expires_at` in the past and
     run `/api/cron/expire-holds`) → confirm the dates become available
     again.
   - Decline a request, propose alternative dates, and cancel a confirmed
     booking → confirm each guest email sends and the status updates
     correctly.
   - Sign in to `/admin`, confirm MFA is enforced, and confirm a `staff`
     account cannot reach Settings/Team/Audit log.
   - Resize the browser (or use dev tools' device toolbar) at ~375px,
     ~768px, and desktop widths on the homepage, `/book`, and an admin
     page — confirm no horizontal scroll and the mobile nav/book bar work.
   - Run Lighthouse (Chrome DevTools) and an accessibility check (axe
     DevTools or Lighthouse's a11y audit) against the homepage and `/book`.

**10. Backups** — Supabase takes automatic daily backups on paid plans
   (Settings → Database → Backups shows your plan's retention window and
   lets you trigger a manual backup/point-in-time restore). On the free
   tier, schedule your own periodic `pg_dump` (Supabase → Database →
   Connection string, or the Supabase CLI's `supabase db dump`) — this
   repo doesn't automate that, since it depends entirely on your Supabase
   plan.

**11. Monitoring** — Vercel's dashboard shows deploy status, function
   invocations/errors, and logs out of the box (Project → Logs/Observability).
   Supabase's dashboard shows database health, API request volume, and
   Auth activity. For error alerting beyond what's in the console
   (`console.error` calls throughout the API routes, `payment_events`,
   `email_log`, and `admin_audit_log` tables), consider adding Sentry or
   Vercel's own log-drain integration — not wired up in this repo, since
   it requires an account/API key of the owner's choosing.

## Project status: what's done, what's left, how to launch

**Completed and working today:** the full booking flow (request → review
→ accept/decline/propose-alternative → deposit payment → confirmation →
check-in/out → cancellation/refund), server-side pricing and availability
with a database-level double-booking guard, a role-based admin portal
(dashboard, bookings, calendar, payments, content, settings, team, audit
log, privacy requests) with MFA and session hardening, 20+ transactional
email types with logging and a resend UI, a full policies system with
versioned consent capture, the security/privacy/reliability hardening and
automated test suite described above, and SEO (metadata, sitemap, robots,
structured data, generated OG image/favicon).

**Outstanding before launch:** everything in "Owner content checklist"
above — this is a functioning, secure booking engine dressed in realistic
placeholder content and a text-wordmark logo, not a ready-to-publish
brochure site. Also outstanding: a live-browser accessibility/responsive
pass (see "Testing" → what's authored but not executable here), and the
legal review noted on the cancellation/house-rules/privacy policy content.

**Exact steps to launch:**
1. Work through "Owner content checklist" — at minimum, real address/
   contact details/rates/photos, since these appear in emails and
   structured data guests and search engines see immediately.
2. Follow "Deployment guide" above, in order, sections 1 → 8.
3. Run every scenario in "Production testing" (section 9) against the live
   project.
4. Set up backups and monitoring (sections 10–11).
5. Have the cancellation/house-rules/privacy policy wording reviewed by a
   local legal professional (South Africa: POPIA applies to the privacy
   notice specifically).
6. Point the domain live, confirm the webhook URL is registered with your
   payment provider, and do one final real (small-amount or sandbox)
   end-to-end payment before announcing publicly.

## Assumptions & placeholders

- No logo file or reference screenshot was attached to the original request, so
  the header uses a text wordmark (`src/components/Logo.tsx`) and the landing
  page uses gradient placeholder tiles for photography — both clearly marked for
  swapping with real assets.
- Guest identity on the public status page (`/booking/[id]`) is the booking UUID
  or reference acting as a bearer token (the same model as the emailed link) —
  there's no separate guest login.
- Currency defaults to ZAR but is admin-configurable (`settings.currency`,
  `/admin/settings`) — every price/fee is formatted with whatever's
  configured, not hardcoded ZAR. Weekend/seasonal rates, cleaning/service
  fees, and the security deposit are all real, live-configurable line items;
  the "Discount" line item remains a static `pricingConfig.discountZar`
  default in `src/lib/config.ts` (no settings field for it) — every fee
  defaults to "off" (0, or a null weekend rate, or no rate overrides) until set.
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

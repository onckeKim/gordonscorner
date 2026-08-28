-- Admin portal hardening, part 2: calendar rate/min-stay overrides (moves
-- seasonal rates from a hardcoded array in config.ts to an admin-editable
-- table), a generic content_sections store for the CMS-style content
-- management screens, and a guest_communications log distinct from
-- `bookings.admin_notes` (private internal notes) and `booking_status_history`
-- (system-generated status transitions).

-- ---------------------------------------------------------------------------
-- DATE RATE OVERRIDES (seasonal / date-specific nightly rates + min-stay)
-- ---------------------------------------------------------------------------
-- Weekend rate stays a single settings.weekend_nightly_rate value (it's a
-- day-of-week rule, not a date range). Ranges here are checked in
-- created_at order — the first matching range wins, same precedence rule
-- the old hardcoded pricingConfig.seasonalRates array documented.
-- [start_date, end_date) — end_date exclusive, matching bookings/blocked_dates.

create table date_rate_overrides (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  label text,
  nightly_rate numeric(10, 2),
  min_nights int,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_override_range check (end_date > start_date),
  constraint has_an_override check (nightly_rate is not null or min_nights is not null)
);

create index date_rate_overrides_range_idx on date_rate_overrides (start_date, end_date);

alter table date_rate_overrides enable row level security;

create policy "Admins can read rate overrides"
  on date_rate_overrides for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

create trigger set_date_rate_overrides_updated_at
  before update on date_rate_overrides
  for each row
  execute procedure extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- CONTENT SECTIONS (CMS-style key/value store for public site copy)
-- ---------------------------------------------------------------------------
-- One row per editable section (e.g. 'home', 'property', 'amenities',
-- 'policies', 'faq', 'contact', 'gallery', 'promo', 'social', 'location').
-- src/lib/content/store.ts falls back to the static defaults in
-- src/lib/content/*.ts for any key with no row yet, so nothing needs
-- seeding here — the DB only holds what an admin has actually edited.

create table content_sections (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id)
);

alter table content_sections enable row level security;

create policy "Admins can read content sections"
  on content_sections for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

create trigger set_content_sections_updated_at
  before update on content_sections
  for each row
  execute procedure extensions.moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- GUEST COMMUNICATIONS (a record of contact with the guest — calls, emails
-- sent outside the automated system, WhatsApp messages, etc.)
-- ---------------------------------------------------------------------------

create table guest_communications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  channel text not null default 'other' check (channel in ('email', 'phone', 'whatsapp', 'sms', 'in_person', 'other')),
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  summary text not null,
  logged_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index guest_communications_booking_idx on guest_communications (booking_id, created_at desc);

alter table guest_communications enable row level security;

create policy "Admins can read guest communications"
  on guest_communications for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

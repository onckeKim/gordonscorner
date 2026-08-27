-- Gordon's Corner booking system schema
-- Run via Supabase CLI: supabase db push
-- or paste into the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------

create type booking_status as enum (
  'pending_review',
  'info_requested',
  'dates_proposed',
  'accepted',
  'deposit_paid',
  'confirmed',
  'balance_paid',
  'declined',
  'expired',
  'cancelled'
);

create type payment_type as enum ('deposit', 'balance');
create type payment_status as enum ('pending', 'paid', 'failed', 'cancelled');
create type status_actor as enum ('guest', 'admin', 'system');

-- ---------------------------------------------------------------------------
-- PROFILES (mirrors auth.users; used for admin role checks in RLS)
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Admins can read their own profile"
  on profiles for select
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- BOOKINGS
-- ---------------------------------------------------------------------------

create table bookings (
  id uuid primary key default gen_random_uuid(),
  reference text unique,                       -- generated on confirmation, e.g. GC-2026-0042
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  check_in date not null,
  check_out date not null,
  nights int generated always as (check_out - check_in) stored,
  guests_count int not null default 1,
  message text,
  status booking_status not null default 'pending_review',

  total_amount numeric(10, 2) not null,
  deposit_amount numeric(10, 2) not null,
  balance_amount numeric(10, 2) not null,
  currency text not null default 'ZAR',

  deposit_paid_at timestamptz,
  balance_paid_at timestamptz,
  balance_marked_paid_by uuid references profiles (id),

  admin_notes text,
  decline_reason text,
  info_request_message text,
  proposed_check_in date,
  proposed_check_out date,

  hold_expires_at timestamptz,                 -- set when status becomes 'accepted'
  payment_token text unique,                   -- opaque token used in /pay/[token]

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint valid_stay check (check_out > check_in),
  constraint min_two_nights check (check_out - check_in >= 2)
);

create index bookings_status_idx on bookings (status);
create index bookings_date_range_idx on bookings (check_in, check_out);
create index bookings_reference_idx on bookings (reference);
create index bookings_payment_token_idx on bookings (payment_token);

create trigger set_bookings_updated_at
  before update on bookings
  for each row
  execute procedure moddatetime(updated_at);

-- moddatetime extension provides the trigger function used above
create extension if not exists moddatetime schema extensions;

-- ---------------------------------------------------------------------------
-- BLOCKED DATES (manual admin holds unrelated to a booking)
-- ---------------------------------------------------------------------------

create table blocked_dates (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  reason text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  constraint valid_block_range check (end_date > start_date)
);

create index blocked_dates_range_idx on blocked_dates (start_date, end_date);

-- ---------------------------------------------------------------------------
-- BOOKING STATUS HISTORY (audit trail)
-- ---------------------------------------------------------------------------

create table booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  from_status booking_status,
  to_status booking_status not null,
  actor status_actor not null,
  actor_id uuid references profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create index booking_status_history_booking_idx on booking_status_history (booking_id);

-- ---------------------------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------------------------

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  type payment_type not null,
  provider text not null,                      -- 'payfast' | 'peach' | 'yoco' | 'dev'
  provider_reference text,
  amount numeric(10, 2) not null,
  status payment_status not null default 'pending',
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_booking_idx on payments (booking_id);
create index payments_provider_reference_idx on payments (provider_reference);

create trigger set_payments_updated_at
  before update on payments
  for each row
  execute procedure moddatetime(updated_at);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table bookings enable row level security;
alter table blocked_dates enable row level security;
alter table booking_status_history enable row level security;
alter table payments enable row level security;

-- Public availability view exposes only date ranges that must block the
-- calendar (no guest PII). All other reads/writes go through server-side
-- API routes using the service-role key, which bypasses RLS.
create view public_unavailable_ranges as
  select check_in as start_date, check_out as end_date, status::text as status
  from bookings
  where status in ('accepted', 'deposit_paid', 'confirmed', 'balance_paid')
    and (status != 'accepted' or hold_expires_at > now())
  union all
  select start_date, end_date, 'blocked' as status
  from blocked_dates;

grant select on public_unavailable_ranges to anon, authenticated;

-- Admins (rows present in profiles) can do everything via authenticated
-- Supabase client; the service role used by API routes bypasses RLS
-- entirely, so these policies mainly protect against a leaked anon key.
create policy "Admins can read all bookings"
  on bookings for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

create policy "Admins can read blocked dates"
  on blocked_dates for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

create policy "Admins can read status history"
  on booking_status_history for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

create policy "Admins can read payments"
  on payments for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

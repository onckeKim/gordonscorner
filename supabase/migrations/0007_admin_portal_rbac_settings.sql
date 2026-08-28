-- Admin portal hardening, part 1: role-based access control, a general
-- admin audit log (distinct from booking_status_history/payment_events,
-- which are booking/payment-specific), login-attempt tracking for lockout
-- protection, and a DB-backed settings singleton so the property's
-- operating rules are admin-editable instead of hardcoded in config.ts.

-- ---------------------------------------------------------------------------
-- ROLE-BASED ACCESS CONTROL
-- ---------------------------------------------------------------------------
-- 'admin' — full access, including settings/content/team/audit log.
-- 'staff' — day-to-day booking + calendar operations only; the app layer
--           (requireRole('admin') in src/lib/auth/admin.ts) enforces the
--           split, not RLS, since all admin-portal reads/writes already go
--           through the service-role client in API routes.

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('admin', 'staff'));

-- ---------------------------------------------------------------------------
-- TAX (settings.tax_rate_percent, below, needs somewhere to record the
-- amount actually applied on each booking — same pattern as the other fee
-- columns added in migration 0004)
-- ---------------------------------------------------------------------------

alter table bookings add column tax_amount numeric(10, 2) not null default 0;

-- ---------------------------------------------------------------------------
-- ADMIN AUDIT LOG (append-only, covers every admin action outside the
-- booking/payment-specific trails that already exist)
-- ---------------------------------------------------------------------------

create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id) on delete set null,
  actor_email text,
  action text not null,          -- e.g. 'settings.update', 'content.update', 'rate.create', 'blocked_date.create'
  record_type text not null,     -- e.g. 'settings', 'content_section', 'rate_override', 'blocked_date', 'profile', 'booking'
  record_id text,                -- free text: uuid, content key, or settings singleton id — record shapes vary
  changes jsonb,                 -- { before: {...}, after: {...} } or a free-form note of what changed
  created_at timestamptz not null default now()
);

create index admin_audit_log_actor_idx on admin_audit_log (actor_id);
create index admin_audit_log_record_idx on admin_audit_log (record_type, record_id);
create index admin_audit_log_created_idx on admin_audit_log (created_at desc);

alter table admin_audit_log enable row level security;

create policy "Admins can read audit log"
  on admin_audit_log for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

-- ---------------------------------------------------------------------------
-- LOGIN ATTEMPTS (repeated-failed-sign-in protection)
-- ---------------------------------------------------------------------------
-- Written/read only by the server (service role) from the login route —
-- never exposed to the browser, so no permissive RLS policy is needed.

create table login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  success boolean not null,
  ip text,
  created_at timestamptz not null default now()
);

create index login_attempts_email_idx on login_attempts (lower(email), created_at desc);

alter table login_attempts enable row level security;

-- ---------------------------------------------------------------------------
-- SETTINGS (singleton row — the property's admin-configurable operating rules)
-- ---------------------------------------------------------------------------
-- `id boolean primary key default true` + a check constraint pinning it to
-- `true` is a standard Postgres trick to guarantee exactly one row ever
-- exists. Every value here has a sensible default matching the previous
-- hardcoded config.ts values, so existing behaviour is unchanged until an
-- admin edits something.

create table settings (
  id boolean primary key default true,
  property_name text not null default 'Gordon''s Corner',
  currency text not null default 'ZAR',
  time_zone text not null default 'Africa/Johannesburg',

  default_nightly_rate numeric(10, 2) not null default 1850,
  weekend_nightly_rate numeric(10, 2),
  deposit_percentage numeric(5, 2) not null default 50,

  min_nights int not null default 2,
  max_nights int not null default 21,
  guest_capacity int not null default 6,

  lead_time_hours int not null default 24,
  same_day_booking_enabled boolean not null default false,
  max_advance_booking_days int not null default 365,
  hold_period_hours int not null default 24,

  tax_rate_percent numeric(5, 2) not null default 0,
  cleaning_fee numeric(10, 2) not null default 450,
  service_fee numeric(10, 2) not null default 0,
  security_deposit numeric(10, 2) not null default 0,

  payment_deadline_hours int not null default 24,
  balance_payment_deadline_days int not null default 7,
  cancellation_policy text not null default
    'Full refund of the deposit if cancelled 14 or more days before check-in. '
    'No refund of the deposit within 14 days of check-in.',

  admin_notification_email text not null default 'admin@gordonscorner.co.za',
  check_in_time text not null default '14:00',
  check_out_time text not null default '10:00',

  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id),

  constraint settings_single_row check (id)
);

insert into settings (id) values (true) on conflict (id) do nothing;

alter table settings enable row level security;

create policy "Admins can read settings"
  on settings for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

create trigger set_settings_updated_at
  before update on settings
  for each row
  execute procedure extensions.moddatetime(updated_at);

comment on table settings is 'Singleton (always id = true). Read via src/lib/settings.ts:getSettings(), written only through updateSettings() (requires role=admin) which also writes an admin_audit_log row.';

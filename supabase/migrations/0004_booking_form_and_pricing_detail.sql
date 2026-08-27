-- Expands bookings with the additional guest-detail and pricing-breakdown
-- fields the booking request form and pricing engine now collect/compute.
-- Nullable throughout (no backfill needed — no production data yet); the
-- application layer requires them via zod validation going forward.

alter table bookings
  add column guest_first_name text,
  add column guest_last_name text,
  add column guest_country text,
  add column estimated_arrival_time text,
  add column booking_purpose text,
  add column terms_agreed_at timestamptz,
  add column cancellation_policy_agreed_at timestamptz,
  add column communication_consent_at timestamptz,
  add column accommodation_subtotal numeric(10, 2),
  add column cleaning_fee_amount numeric(10, 2) not null default 0,
  add column service_fee_amount numeric(10, 2) not null default 0,
  add column discount_amount numeric(10, 2) not null default 0,
  add column security_deposit_amount numeric(10, 2) not null default 0,
  add column nightly_rate_breakdown jsonb;

-- Superseded by the two explicit consent timestamps above (booking terms vs.
-- cancellation policy are now recorded separately, per the booking form spec).
alter table bookings drop column if exists policy_agreed_at;

comment on column bookings.guest_first_name is 'Structured given name; guest_name remains the combined display name.';
comment on column bookings.guest_last_name is 'Structured family name; guest_name remains the combined display name.';
comment on column bookings.estimated_arrival_time is 'Free-text guest-provided estimate, e.g. "Around 15:00" — not used for any automated logic.';
comment on column bookings.booking_purpose is 'Optional, guest-provided: leisure | business | other.';
comment on column bookings.nightly_rate_breakdown is 'Snapshot of the per-night rate resolution (standard/weekend/seasonal) at time of booking, for audit/support.';

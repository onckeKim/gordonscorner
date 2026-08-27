-- Adds guest-composition and policy-agreement tracking to bookings, to
-- support the availability/booking page's adults/children split and
-- required policy-agreement checkbox.

alter table bookings
  add column adults_count int,
  add column children_count int,
  add column policy_agreed_at timestamptz;

comment on column bookings.adults_count is 'Adults included in guests_count; optional detail captured at booking time.';
comment on column bookings.children_count is 'Children included in guests_count; optional detail captured at booking time.';
comment on column bookings.policy_agreed_at is 'When the guest confirmed the required policy-agreement checkbox on the booking form.';

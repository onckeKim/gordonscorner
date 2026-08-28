-- Policy consent versioning. The booking form already recorded
-- terms_agreed_at (booking policy) and cancellation_policy_agreed_at
-- (migration 0001/0002) — this adds the missing privacy-policy consent and
-- a policy_version snapshot so a booking's acceptance always points to the
-- exact wording of the Policies page the guest actually saw, even if the
-- page is edited later.

alter table bookings
  add column privacy_policy_agreed_at timestamptz,
  add column policy_version text;

comment on column bookings.policy_version is 'Snapshot of POLICY_VERSION (src/lib/content/policy-sections.ts) at the moment the guest accepted — lets admins see which wording of /policies a given booking agreed to, even after the page is later edited.';

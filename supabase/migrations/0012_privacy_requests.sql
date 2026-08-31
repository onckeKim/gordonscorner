-- Guest-facing privacy request log (POPIA/GDPR-style data-subject requests):
-- export, correction, or deletion. Guests submit via the public
-- /privacy-request page; admins triage and resolve from the admin portal.
-- Kept as an admin-actionable queue rather than automated self-service
-- deletion, since bookings/payments carry statutory retention obligations
-- an admin must weigh before acting.

create table privacy_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('export', 'correction', 'deletion')),
  name text not null,
  email text not null,
  details text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'completed', 'rejected')),
  admin_note text,
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index privacy_requests_status_idx on privacy_requests (status, created_at desc);

alter table privacy_requests enable row level security;
-- No policies: only the service-role client (admin API routes) reads or writes this table.

comment on table privacy_requests is 'Guest data-subject requests (export/correction/deletion) submitted via /privacy-request and actioned by admins.';

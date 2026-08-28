-- Hardens the payment engine: a fuller status vocabulary, refunds as a
-- first-class payment type, idempotency guarantees against duplicate
-- webhook processing, manual/EFT payment support with proof-of-payment
-- uploads, and an append-only audit trail separate from the mutable
-- `payments` rows.

-- Postgres can add enum values in place (unlike removing them, which
-- required rebuilding booking_status in migration 0003) — no type rebuild
-- needed here.
alter type payment_status add value if not exists 'processing' after 'pending';
alter type payment_status add value if not exists 'refunded' after 'failed';
alter type payment_status add value if not exists 'partially_refunded' after 'refunded';

alter type payment_type add value if not exists 'refund';

alter table payments
  add column idempotency_key text,
  add column admin_note text,
  add column recorded_by uuid references profiles (id),
  add column proof_of_payment_url text,
  add column refunded_amount numeric(10, 2) not null default 0,
  add column paid_at timestamptz;

comment on column payments.idempotency_key is 'Set when we initiate a payment attempt (e.g. m_payment_id sent to the provider) so a retried webhook for the same attempt cannot be double-applied.';
comment on column payments.recorded_by is 'Admin who recorded this payment — set only for provider != online providers (manual/EFT) or a recorded refund.';
comment on column payments.refunded_amount is 'Cumulative amount refunded against this specific paid payment. status becomes refunded (= amount) or partially_refunded (< amount) accordingly.';
comment on column payments.paid_at is 'When the payment actually succeeded, distinct from created_at (when the attempt/row was first recorded).';

-- The real guard against duplicate webhook processing: a given provider
-- transaction reference can only ever be recorded once. Partial index so
-- multiple pending/manual rows without a reference yet never collide.
create unique index payments_provider_reference_unique
  on payments (provider, provider_reference)
  where provider_reference is not null;

create unique index payments_idempotency_key_unique
  on payments (idempotency_key)
  where idempotency_key is not null;

-- ---------------------------------------------------------------------------
-- PAYMENT EVENTS (append-only audit trail)
-- ---------------------------------------------------------------------------
-- Every payment-related occurrence gets logged here, regardless of whether
-- it changed anything — webhook receipts (verified or not), duplicates
-- ignored, amount mismatches, manual actions, refunds, resent links. Unlike
-- `payments` (current state, updated in place) this table is never
-- updated, only inserted into, so nothing is ever lost.

create table payment_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings (id) on delete cascade,
  payment_id uuid references payments (id) on delete set null,
  event_type text not null,
  provider text,
  actor status_actor not null default 'system',
  actor_id uuid references profiles (id),
  note text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index payment_events_booking_idx on payment_events (booking_id);
create index payment_events_payment_idx on payment_events (payment_id);

alter table payment_events enable row level security;

create policy "Admins can read payment events"
  on payment_events for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

-- ---------------------------------------------------------------------------
-- STORAGE: proof-of-payment uploads
-- ---------------------------------------------------------------------------
-- Private bucket — files are uploaded and read via the server-side
-- service-role client only (see src/app/api/bookings/[id]/payments/manual),
-- which bypasses RLS entirely. These policies are a safety net against a
-- leaked anon/authenticated key reading guests' financial documents.

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create policy "Admins can manage payment proof uploads"
  on storage.objects for all
  using (bucket_id = 'payment-proofs' and exists (select 1 from profiles p where p.id = auth.uid()))
  with check (bucket_id = 'payment-proofs' and exists (select 1 from profiles p where p.id = auth.uid()));

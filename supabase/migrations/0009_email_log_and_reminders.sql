-- Email delivery audit trail + the timestamp columns that make the
-- scheduled/reminder email cron (src/app/api/cron/send-scheduled-emails)
-- idempotent — each reminder type is sent at most once per booking.

-- ---------------------------------------------------------------------------
-- EMAIL LOG (append-only — every send attempt, success or failure)
-- ---------------------------------------------------------------------------

create table email_log (
  id uuid primary key default gen_random_uuid(),
  email_type text not null,
  recipient text not null,
  booking_id uuid references bookings (id) on delete set null,
  booking_reference text,
  status text not null check (status in ('sent', 'failed')),
  provider text not null,
  provider_message_id text,
  failure_reason text,
  sent_at timestamptz not null default now()
);

create index email_log_booking_idx on email_log (booking_id, sent_at desc);
create index email_log_type_idx on email_log (email_type, sent_at desc);

alter table email_log enable row level security;

create policy "Admins can read email log"
  on email_log for select
  using (exists (select 1 from profiles p where p.id = auth.uid()));

-- ---------------------------------------------------------------------------
-- REMINDER DEDUP COLUMNS
-- ---------------------------------------------------------------------------
-- Each is set the first (and only) time its corresponding scheduled email
-- goes out for a booking, so a cron run that fires more than once a day (or
-- is retried) never double-sends.

alter table bookings
  add column deposit_reminder_sent_at timestamptz,
  add column deposit_deadline_warning_sent_at timestamptz,
  add column balance_reminder_sent_at timestamptz,
  add column pre_arrival_sent_at timestamptz,
  add column check_in_instructions_sent_at timestamptz,
  add column check_out_reminder_sent_at timestamptz,
  add column thank_you_sent_at timestamptz,
  add column review_request_sent_at timestamptz;

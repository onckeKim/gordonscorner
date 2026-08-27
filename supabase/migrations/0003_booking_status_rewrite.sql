-- Rewrites booking_status to the full controlled vocabulary used by the
-- booking engine (submitted -> under_review -> ... -> checked_out/no_show),
-- replacing the smaller original set. This project has no production data
-- yet, so this migration recreates the enum type outright (Postgres can't
-- drop enum values in place) rather than carrying legacy names forward.
--
-- Status meanings:
--   draft                      — reserved for a future multi-step/save-and-resume
--                                 booking form; not yet produced by the current
--                                 single-page booking flow (see README).
--   submitted                  — guest just submitted the request.
--   under_review               — an admin has opened the request (auto-set the
--                                 first time the admin booking-detail page loads it).
--   information_required       — admin asked the guest a question.
--   alternative_dates_proposed — admin proposed different dates.
--   accepted_awaiting_deposit  — admin accepted; dates held; deposit link sent.
--   deposit_processing         — guest has been sent to the payment provider;
--                                 set right before checkout, resolved by the
--                                 payment webhook to confirmed or back to
--                                 accepted_awaiting_deposit.
--   confirmed                  — deposit paid; dates hard-blocked.
--   declined / expired / cancelled — terminal, dates released.
--   checked_in / checked_out / no_show — post-arrival lifecycle, admin-set.

-- 1. Drop the view that depends on the enum column.
drop view if exists public_unavailable_ranges;

-- 2. Widen the enum columns to text so the old type can be dropped.
alter table bookings alter column status type text;
alter table bookings alter column status drop default;
alter table booking_status_history alter column from_status type text;
alter table booking_status_history alter column to_status type text;

drop type booking_status;

-- 3. Recreate the enum with the full vocabulary.
create type booking_status as enum (
  'draft',
  'submitted',
  'under_review',
  'information_required',
  'alternative_dates_proposed',
  'accepted_awaiting_deposit',
  'deposit_processing',
  'confirmed',
  'declined',
  'expired',
  'cancelled',
  'checked_in',
  'checked_out',
  'no_show'
);

-- 4. Map old values to new ones and switch the columns back to the enum.
update bookings set status = case status
  when 'pending_review' then 'submitted'
  when 'info_requested' then 'information_required'
  when 'dates_proposed' then 'alternative_dates_proposed'
  when 'accepted' then 'accepted_awaiting_deposit'
  when 'deposit_paid' then 'confirmed'
  when 'balance_paid' then 'confirmed'
  else status
end;

update booking_status_history set from_status = case from_status
  when 'pending_review' then 'submitted'
  when 'info_requested' then 'information_required'
  when 'dates_proposed' then 'alternative_dates_proposed'
  when 'accepted' then 'accepted_awaiting_deposit'
  when 'deposit_paid' then 'confirmed'
  when 'balance_paid' then 'confirmed'
  else from_status
end
where from_status is not null;

update booking_status_history set to_status = case to_status
  when 'pending_review' then 'submitted'
  when 'info_requested' then 'information_required'
  when 'dates_proposed' then 'alternative_dates_proposed'
  when 'accepted' then 'accepted_awaiting_deposit'
  when 'deposit_paid' then 'confirmed'
  when 'balance_paid' then 'confirmed'
  else to_status
end;

alter table bookings
  alter column status type booking_status using status::booking_status,
  alter column status set default 'submitted';

alter table booking_status_history
  alter column from_status type booking_status using from_status::booking_status,
  alter column to_status type booking_status using to_status::booking_status;

-- 5. Recreate the public availability view against the new status names.
--    "held" = accepted_awaiting_deposit / deposit_processing (soft hold,
--    accepted_awaiting_deposit expires via hold_expires_at); "confirmed" =
--    confirmed / checked_in / checked_out (hard-blocked, no expiry).
create view public_unavailable_ranges as
  select
    check_in as start_date,
    check_out as end_date,
    case
      when status in ('accepted_awaiting_deposit', 'deposit_processing') then 'held'
      else 'confirmed'
    end as status
  from bookings
  where status in ('accepted_awaiting_deposit', 'deposit_processing', 'confirmed', 'checked_in', 'checked_out')
    and (status not in ('accepted_awaiting_deposit', 'deposit_processing') or hold_expires_at > now())
  union all
  select start_date, end_date, 'blocked' as status
  from blocked_dates;

grant select on public_unavailable_ranges to anon, authenticated;

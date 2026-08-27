-- Database-level guarantee against overlapping bookings/holds, independent
-- of any application-level check-then-insert logic (which is inherently
-- racy under concurrent requests — two guests could both pass
-- checkAvailability() before either commits). This is the actual defence
-- against double-booking; src/lib/booking/availability.ts is only a fast,
-- friendly pre-check that avoids hitting this constraint in the common case.
--
-- btree_gist lets a plain (non-range-typed) column combination be indexed
-- with GiST, which EXCLUDE constraints require.
create extension if not exists btree_gist;

-- Note: the predicate can't reference now() (Postgres requires exclusion/
-- partial-index predicates to be immutable), so a hold whose
-- hold_expires_at has lapsed but hasn't been flipped to 'expired' by the
-- /api/cron/expire-holds job yet still counts as blocking here. That's the
-- safe direction to err in — it never allows a double-booking, and it
-- self-heals as soon as the cron runs.
alter table bookings
  add constraint no_overlapping_active_bookings
  exclude using gist (
    daterange(check_in, check_out, '[)') with &&
  )
  where (status in ('accepted_awaiting_deposit', 'deposit_processing', 'confirmed', 'checked_in', 'checked_out'));

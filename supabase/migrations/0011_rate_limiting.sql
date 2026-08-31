-- Generic fixed-window rate limiting, used by src/lib/rate-limit.ts to
-- protect public endpoints (booking submission, enquiries, admin login)
-- from being hammered. A Postgres function rather than a select-then-update
-- round trip from the app, so concurrent requests for the same key can't
-- race past the limit — the increment-and-check happens atomically in one
-- statement.

create table rate_limits (
  key text primary key,
  count int not null default 1,
  window_start timestamptz not null default now()
);

comment on table rate_limits is 'Fixed-window rate limit counters, keyed by "<bucket>:<identifier>" (e.g. "bookings:203.0.113.5"). No RLS policies — read/written only via the service-role client and the function below.';

alter table rate_limits enable row level security;

-- Atomically records one hit for `p_key` and reports whether it's still
-- within the limit. Resets the window if the previous one has expired.
create or replace function rate_limit_hit(p_key text, p_max_count int, p_window_seconds int)
returns boolean
language plpgsql
as $$
declare
  v_allowed boolean;
begin
  insert into rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set
      count = case
        when rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else rate_limits.window_start
      end
  returning (count <= p_max_count) into v_allowed;

  return v_allowed;
end;
$$;

-- Housekeeping: old rows are harmless (tiny table, keyed by identifier) but
-- there's no automatic cleanup — a stale key just resets on next use. If
-- the table grows large in practice, delete rows with
-- window_start < now() - interval '1 day' on a schedule.

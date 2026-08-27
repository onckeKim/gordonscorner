import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/StatusBadge';
import { BlockDatesForm } from '@/components/admin/BlockDatesForm';
import { BlockedDatesList } from '@/components/admin/BlockedDatesList';

export default async function AdminCalendarPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: bookings }, { data: blockedDates }] = await Promise.all([
    supabase
      .from('bookings')
      .select('*')
      .in('status', ['accepted_awaiting_deposit', 'deposit_processing', 'confirmed', 'checked_in', 'checked_out'])
      .order('check_in', { ascending: true }),
    supabase.from('blocked_dates').select('*').order('start_date', { ascending: true }),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr,1fr]">
      <div className="space-y-6">
        <div className="card">
          <h1 className="font-display text-2xl font-semibold">Upcoming &amp; held dates</h1>
          <ul className="mt-4 space-y-2 text-sm">
            {(bookings ?? []).map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between border-t border-corner-border pt-2 first:border-t-0 first:pt-0"
              >
                <div>
                  <Link href={`/admin/bookings/${b.id}`} className="font-medium hover:underline">
                    {b.guest_name}
                  </Link>
                  <p className="text-corner-muted">
                    {b.check_in} &rarr; {b.check_out}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
            {(bookings ?? []).length === 0 && (
              <p className="text-corner-muted">No held or confirmed dates right now.</p>
            )}
          </ul>
        </div>

        <div className="card">
          <h2 className="font-display text-lg font-semibold">Manual blocks</h2>
          <div className="mt-3">
            <BlockedDatesList blockedDates={blockedDates ?? []} />
          </div>
        </div>
      </div>

      <BlockDatesForm />
    </div>
  );
}

import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { toCsv } from '@/lib/csv';
import { handleApiError } from '@/lib/api-response';

const COLUMNS = [
  'id',
  'booking_id',
  'booking_reference',
  'guest_name',
  'type',
  'provider',
  'provider_reference',
  'amount',
  'currency',
  'status',
  'refunded_amount',
  'paid_at',
  'created_at',
  'recorded_by',
  'admin_note',
];

/** Admin: download the payments ledger as CSV — all payments, or one booking's via ?bookingId=. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = createAdminSupabaseClient();
    const bookingId = request.nextUrl.searchParams.get('bookingId');

    let paymentsQuery = db.from('payments').select('*').order('created_at', { ascending: false });
    if (bookingId) {
      paymentsQuery = paymentsQuery.eq('booking_id', bookingId);
    }

    const [{ data: payments, error }, { data: bookings, error: bookingsError }] = await Promise.all([
      paymentsQuery,
      db.from('bookings').select('id, reference, guest_name, currency'),
    ]);

    if (error) throw error;
    if (bookingsError) throw bookingsError;

    const bookingById = new Map((bookings ?? []).map((b) => [b.id, b]));

    const rows = (payments ?? []).map((p) => {
      const booking = bookingById.get(p.booking_id);
      return {
        id: p.id,
        booking_id: p.booking_id,
        booking_reference: booking?.reference ?? '',
        guest_name: booking?.guest_name ?? '',
        type: p.type,
        provider: p.provider,
        provider_reference: p.provider_reference,
        amount: p.amount,
        currency: booking?.currency ?? '',
        status: p.status,
        refunded_amount: p.refunded_amount,
        paid_at: p.paid_at,
        created_at: p.created_at,
        recorded_by: p.recorded_by,
        admin_note: p.admin_note,
      };
    });

    const csv = toCsv(rows, COLUMNS);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="payments-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

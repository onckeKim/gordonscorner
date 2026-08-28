import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { toCsv } from '@/lib/csv';
import { handleApiError } from '@/lib/api-response';

const COLUMNS = [
  'id',
  'reference',
  'status',
  'guest_name',
  'guest_email',
  'guest_phone',
  'guest_country',
  'check_in',
  'check_out',
  'nights',
  'guests_count',
  'total_amount',
  'deposit_amount',
  'balance_amount',
  'currency',
  'deposit_paid_at',
  'balance_paid_at',
  'created_at',
];

/** Admin: download the bookings ledger as CSV — all bookings, or one via ?bookingId=. */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const db = createAdminSupabaseClient();
    const bookingId = request.nextUrl.searchParams.get('bookingId');

    let query = db.from('bookings').select('*').order('created_at', { ascending: false });
    if (bookingId) {
      query = query.eq('id', bookingId);
    }
    const { data: bookings, error } = await query;

    if (error) throw error;

    const csv = toCsv(bookings ?? [], COLUMNS);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

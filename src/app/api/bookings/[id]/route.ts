import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-response';

/**
 * Public endpoint: fetch a single booking by id for the guest status page.
 * The id (a UUID) acts as a capability token — anyone with the link can
 * view status, which is the same model as the emailed status-page link.
 * Internal-only fields (admin_notes) are stripped before returning.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = createAdminSupabaseClient();
    // The lookup accepts either the booking's UUID (from the emailed status
    // link) or its human-friendly reference (e.g. GC-2026-4V9K, once confirmed).
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const { data: booking, error } = await db
      .from('bookings')
      .select('*')
      .eq(isUuid ? 'id' : 'reference', id)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    const { admin_notes: _adminNotes, ...guestSafeBooking } = booking;
    return NextResponse.json({ booking: guestSafeBooking });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createPaymentLink } from '@/lib/payments';
import { sendBalancePaymentLinkEmail } from '@/lib/email';
import { WorkflowError } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

/**
 * Admin-triggered, optional convenience: emails the guest a secure link to
 * pay the remaining balance online. Not required by the core workflow —
 * rule 9 lets admins simply mark the balance as paid once settled by any
 * means (EFT, cash, card on arrival) — but useful when a guest wants to
 * settle the balance ahead of time.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const db = createAdminSupabaseClient();
    const { data: booking, error } = await db.from('bookings').select('*').eq('id', id).single();

    if (error || !booking) {
      throw new WorkflowError('Booking not found.');
    }
    if (booking.status !== 'confirmed') {
      throw new WorkflowError('Balance can only be requested for confirmed bookings.');
    }

    const { url } = await createPaymentLink(booking, 'balance');
    await sendBalancePaymentLinkEmail(booking, url);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

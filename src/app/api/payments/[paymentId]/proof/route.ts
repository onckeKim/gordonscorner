import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-response';

/** Admin: get a short-lived signed URL to view/download a proof-of-payment file. */
export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  try {
    await requireAdmin();
    const { paymentId } = await params;
    const db = createAdminSupabaseClient();

    const { data: payment, error } = await db
      .from('payments')
      .select('proof_of_payment_url')
      .eq('id', paymentId)
      .single();

    if (error || !payment?.proof_of_payment_url) {
      return NextResponse.json({ error: 'No proof of payment on file.' }, { status: 404 });
    }

    const { data: signed, error: signError } = await db.storage
      .from('payment-proofs')
      .createSignedUrl(payment.proof_of_payment_url, 60 * 5);

    if (signError || !signed) {
      return NextResponse.json({ error: 'Could not create a link to the file.' }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err) {
    return handleApiError(err);
  }
}

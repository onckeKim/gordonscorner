import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { recordManualPayment, WorkflowError } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const fieldsSchema = z.object({
  type: z.enum(['deposit', 'balance']),
  amount: z.coerce.number().positive(),
  reference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(2000).optional(),
  paidAt: z.string().datetime().optional(),
});

const MAX_PROOF_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_PROOF_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** Admin: record an EFT/manual payment, optionally with a proof-of-payment upload. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const formData = await request.formData();
    const parsed = fieldsSchema.parse({
      type: formData.get('type'),
      amount: formData.get('amount'),
      reference: formData.get('reference') || undefined,
      note: formData.get('note') || undefined,
      paidAt: formData.get('paidAt') || undefined,
    });

    const db = createAdminSupabaseClient();
    let proofOfPaymentUrl: string | undefined;

    const proofFile = formData.get('proof');
    if (proofFile instanceof File && proofFile.size > 0) {
      if (proofFile.size > MAX_PROOF_BYTES) {
        throw new WorkflowError('Proof of payment file is too large (10MB max).');
      }
      // Trust only the extension mapped from the validated MIME type — never
      // the attacker-controlled original filename.
      const safeExtension = ALLOWED_PROOF_TYPES[proofFile.type];
      if (!safeExtension) {
        throw new WorkflowError('Proof of payment must be a JPEG, PNG, WebP, or PDF file.');
      }

      const path = `${id}/${randomUUID()}.${safeExtension}`;
      const bytes = await proofFile.arrayBuffer();

      const { error: uploadError } = await db.storage
        .from('payment-proofs')
        .upload(path, bytes, { contentType: proofFile.type, upsert: false });

      if (uploadError) {
        console.error('Proof of payment upload failed:', uploadError);
        throw new WorkflowError('Could not upload proof of payment. Please try again.');
      }
      proofOfPaymentUrl = path;
    }

    const booking = await recordManualPayment(id, admin.id, {
      type: parsed.type,
      amount: parsed.amount,
      reference: parsed.reference,
      note: parsed.note,
      paidAt: parsed.paidAt,
      proofOfPaymentUrl,
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

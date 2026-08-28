import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { logGuestCommunication } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({
  channel: z.enum(['email', 'phone', 'whatsapp', 'sms', 'in_person', 'other']),
  direction: z.enum(['outbound', 'inbound']),
  summary: z.string().trim().min(1).max(2000),
});

/** Admin: record that contact happened with the guest (call, WhatsApp, email outside the automated flow). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const input = bodySchema.parse(await request.json());
    const communication = await logGuestCommunication(id, admin, input);
    return NextResponse.json({ communication }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

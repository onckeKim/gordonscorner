import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guestAcceptsProposedDates, guestDeclinesProposedDates } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({ action: z.enum(['accept', 'decline']) });

/** Public: guest accepts/declines the admin's proposed alternative dates. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { action } = bodySchema.parse(await request.json());
    const booking =
      action === 'accept' ? await guestAcceptsProposedDates(id) : await guestDeclinesProposedDates(id);
    return NextResponse.json({ booking });
  } catch (err) {
    return handleApiError(err);
  }
}

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { acceptBooking } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const booking = await acceptBooking(id, admin.id);
    return NextResponse.json({ booking });
  } catch (err) {
    return handleApiError(err);
  }
}

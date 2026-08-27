import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { requestInfo } from '@/lib/booking/workflow';
import { handleApiError } from '@/lib/api-response';

const bodySchema = z.object({ message: z.string().trim().min(1).max(2000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const { message } = bodySchema.parse(await request.json());
    const booking = await requestInfo(id, admin.id, message);
    return NextResponse.json({ booking });
  } catch (err) {
    return handleApiError(err);
  }
}

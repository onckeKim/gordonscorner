import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/admin';
import { listRedirects, createRedirect, deleteRedirect, SeoStoreError } from '@/lib/seo/store';
import { handleApiError } from '@/lib/api-response';

const createSchema = z.object({
  from_path: z.string().trim().min(1).max(200).regex(/^\//, 'Path must start with /'),
  to_path: z.string().trim().min(1).max(500),
  status_code: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).optional(),
});

const deleteSchema = z.object({ id: z.string().uuid() });

export async function GET() {
  try {
    await requireRole('admin');
    const redirects = await listRedirects();
    return NextResponse.json({ redirects });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole('admin');
    const input = createSchema.parse(await request.json());
    if (input.from_path === input.to_path) {
      throw new SeoStoreError('A redirect cannot point to itself.');
    }
    const redirect = await createRedirect(admin, input);
    return NextResponse.json({ redirect }, { status: 201 });
  } catch (err) {
    if (err instanceof SeoStoreError) return NextResponse.json({ error: err.message }, { status: 400 });
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireRole('admin');
    const { id } = deleteSchema.parse(await request.json());
    await deleteRedirect(admin, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

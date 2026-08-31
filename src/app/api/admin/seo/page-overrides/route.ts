import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/admin';
import { listPageSeoOverrides, upsertPageSeoOverride, deletePageSeoOverride, SeoStoreError } from '@/lib/seo/store';
import { handleApiError } from '@/lib/api-response';

const upsertSchema = z.object({
  path: z.string().trim().min(1).max(200).regex(/^\//, 'Path must start with /'),
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(400).optional(),
  canonical_path: z.string().trim().max(200).optional(),
  og_image_url: z.string().trim().max(500).optional(),
  noindex: z.boolean().optional(),
});

const deleteSchema = z.object({ path: z.string().trim().min(1) });

export async function GET() {
  try {
    await requireRole('admin');
    const overrides = await listPageSeoOverrides();
    return NextResponse.json({ overrides });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole('admin');
    const input = upsertSchema.parse(await request.json());
    const override = await upsertPageSeoOverride(admin, input);
    return NextResponse.json({ override }, { status: 201 });
  } catch (err) {
    if (err instanceof SeoStoreError) return NextResponse.json({ error: err.message }, { status: 400 });
    return handleApiError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireRole('admin');
    const { path } = deleteSchema.parse(await request.json());
    await deletePageSeoOverride(admin, path);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

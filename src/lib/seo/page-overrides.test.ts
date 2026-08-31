import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: vi.fn(),
}));

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { resolvePageSeo } from './page-overrides';

function mockOverride(override: Record<string, unknown> | null, error: unknown = null) {
  const fakeClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: override, error }),
        }),
      }),
    }),
  };
  vi.mocked(createAdminSupabaseClient).mockReturnValue(fakeClient as unknown as ReturnType<typeof createAdminSupabaseClient>);
}

const defaults = { path: '/accommodation', title: 'Accommodation', description: 'Default description.' };

describe('resolvePageSeo', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to the coded defaults when no override row exists', async () => {
    mockOverride(null);
    const metadata = await resolvePageSeo(defaults);
    expect(metadata.title).toBe('Accommodation');
    expect(metadata.description).toBe('Default description.');
    expect(metadata.alternates).toEqual({ canonical: '/accommodation' });
    expect(metadata.robots).toBeUndefined();
  });

  it('uses the admin-set title/description when present', async () => {
    mockOverride({ title: 'Custom Title', description: 'Custom description.', canonical_path: null, og_image_url: null, noindex: false });
    const metadata = await resolvePageSeo(defaults);
    expect(metadata.title).toBe('Custom Title');
    expect(metadata.description).toBe('Custom description.');
  });

  it('falls back to defaults for any override field left blank', async () => {
    mockOverride({ title: '', description: null, canonical_path: null, og_image_url: null, noindex: false });
    const metadata = await resolvePageSeo(defaults);
    expect(metadata.title).toBe('Accommodation');
    expect(metadata.description).toBe('Default description.');
  });

  it('uses the override canonical path when set', async () => {
    mockOverride({ title: null, description: null, canonical_path: '/accommodation-old', og_image_url: null, noindex: false });
    const metadata = await resolvePageSeo(defaults);
    expect(metadata.alternates).toEqual({ canonical: '/accommodation-old' });
  });

  it('sets robots noindex when the override flags it', async () => {
    mockOverride({ title: null, description: null, canonical_path: null, og_image_url: null, noindex: true });
    const metadata = await resolvePageSeo(defaults);
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('includes an OG image only when the override sets one', async () => {
    mockOverride({ title: null, description: null, canonical_path: null, og_image_url: 'https://example.com/og.jpg', noindex: false });
    const metadata = await resolvePageSeo(defaults);
    expect(metadata.openGraph).toMatchObject({ images: [{ url: 'https://example.com/og.jpg' }] });
  });

  it('falls back to the coded defaults if the database read throws', async () => {
    vi.mocked(createAdminSupabaseClient).mockImplementation(() => {
      throw new Error('connection refused');
    });
    const metadata = await resolvePageSeo(defaults);
    expect(metadata.title).toBe('Accommodation');
    expect(metadata.description).toBe('Default description.');
  });
});

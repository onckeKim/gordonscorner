import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const from = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from })),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

const REQUIRED_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(30),
};

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  for (const key of Object.keys(REQUIRED_ENV)) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  from.mockReset();
});

afterEach(() => {
  for (const key of Object.keys(REQUIRED_ENV)) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.useRealTimers();
});

function mockRedirectRows(rows: { from_path: string; to_path: string; status_code: number }[]) {
  from.mockReturnValue({ select: () => Promise.resolve({ data: rows }) });
}

describe('lookupRedirect', () => {
  it('returns null when Supabase env vars are not configured, without querying anything', async () => {
    const { lookupRedirect } = await import('./middleware');
    const result = await lookupRedirect('/old-page');
    expect(result).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it('returns the matching rule for an exact path match', async () => {
    Object.assign(process.env, REQUIRED_ENV);
    mockRedirectRows([{ from_path: '/old-page', to_path: '/new-page', status_code: 308 }]);
    const { lookupRedirect } = await import('./middleware');

    const result = await lookupRedirect('/old-page');
    expect(result).toEqual({ from_path: '/old-page', to_path: '/new-page', status_code: 308 });
  });

  it('returns null for a path with no configured redirect', async () => {
    Object.assign(process.env, REQUIRED_ENV);
    mockRedirectRows([{ from_path: '/old-page', to_path: '/new-page', status_code: 308 }]);
    const { lookupRedirect } = await import('./middleware');

    expect(await lookupRedirect('/unrelated-page')).toBeNull();
  });

  it('only queries the database once for repeated lookups within the cache TTL', async () => {
    Object.assign(process.env, REQUIRED_ENV);
    mockRedirectRows([{ from_path: '/old-page', to_path: '/new-page', status_code: 308 }]);
    const { lookupRedirect } = await import('./middleware');

    await lookupRedirect('/old-page');
    await lookupRedirect('/anything-else');
    await lookupRedirect('/old-page');

    expect(from).toHaveBeenCalledTimes(1);
  });

  it('re-queries the database once the cache TTL has elapsed', async () => {
    Object.assign(process.env, REQUIRED_ENV);
    mockRedirectRows([{ from_path: '/old-page', to_path: '/new-page', status_code: 308 }]);
    const { lookupRedirect } = await import('./middleware');

    await lookupRedirect('/old-page');
    vi.setSystemTime(new Date('2026-01-01T00:02:00Z')); // 2 minutes later, past the 60s TTL
    await lookupRedirect('/old-page');

    expect(from).toHaveBeenCalledTimes(2);
  });

  it('fails open (returns null) if the database query throws', async () => {
    Object.assign(process.env, REQUIRED_ENV);
    from.mockReturnValue({
      select: () => {
        throw new Error('connection refused');
      },
    });
    const { lookupRedirect } = await import('./middleware');

    expect(await lookupRedirect('/old-page')).toBeNull();
  });
});

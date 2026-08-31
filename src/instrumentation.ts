/**
 * Runs once when a new server instance starts (Next.js instrumentation
 * hook — stable since Next 14, no config flag needed). Validates every
 * required environment variable up front so a misconfigured deployment
 * fails immediately with a clear list of what's wrong, instead of failing
 * later inside whichever request handler first touches the missing var.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@/lib/env');
    validateEnv();
  }
}

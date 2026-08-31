// Vitest runs in plain Node, which lacks Next.js's "react-server" module
// resolution condition — the real `server-only` package unconditionally
// throws without it (see node_modules/server-only/index.js). This stub is
// aliased in vitest.config.ts so modules importing 'server-only' can still
// be unit tested; it is never bundled by the actual Next.js build.
export {};

import { defineConfig } from 'vitest/config';
import path from 'path';

const rootDir = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
      'server-only': path.resolve(rootDir, './src/test/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

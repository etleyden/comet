import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const isVitest = !!process.env.VITEST;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  resolve: {
    alias: {
      shared: path.resolve(__dirname, '../shared/src/index.ts'),
      '@test': path.resolve(__dirname, 'src/__tests__'),
    },
  },
  // SSL certs are only needed for the dev server, not tests.
  // Guard with isVitest so fs.readFileSync is never called during vitest runs.
  server: isVitest
    ? undefined
    : {
      host: '0.0.0.0',
      https: {
        key: fs.readFileSync(path.resolve(__dirname, '../certs/localhost-key.pem')),
        cert: fs.readFileSync(path.resolve(__dirname, '../certs/localhost-cert.pem')),
      },
      watch: {
        usePolling: true,
      },
    },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{unit,integration}.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    reporters: ['default', 'json'],
    outputFile: {
      json: '../reports/frontend/test-results.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../reports/frontend/coverage',
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.test.tsx'],
    },
  },
});

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const isVitest = !!process.env.VITEST;
// do we need to serve SSL certs (development only)
const isServe = process.argv.includes('serve') ||
  (process.argv.some(a => a.endsWith('/vite')) && !process.argv.includes('build'));

const keyPath = path.resolve(__dirname, '../certs/localhost-key.pem');
const certPath = path.resolve(__dirname, '../certs/localhost-cert.pem');
const hasCerts = fs.existsSync(keyPath) && fs.existsSync(certPath);

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
  // SSL certs are only needed for the Vite dev server, not tests or production builds.
  server: isServe && !isVitest && hasCerts
    ? {
      host: '0.0.0.0',
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
      watch: {
        usePolling: true,
      },
    }
    : undefined,
  test: {
    globals: true,
    environment: 'jsdom',
    env: {
      VITE_API_URL: 'https://localhost:86',
    },
    include: ['src/**/*.test.{unit,integration}.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 10000,
    reporters: ['default', 'json'],
    outputFile: {
      json: '../reports/frontend/test-results.json',
    },
    coverage: {
      provider: 'v8',
      reporter: [
        'text',                                       // console output when running
        'html',                                       // friendly HTML UI (served via coverage:view)
        'json-summary',                              // machine-readable summary
        ['text', { file: 'coverage-summary.txt' }],  // text artifact in reports/frontend/coverage/
      ],
      reportsDirectory: '../reports/frontend/coverage',
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.test.tsx'],
    },
  },
});

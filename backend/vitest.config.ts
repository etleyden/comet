import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';
import path from 'path';

export default defineConfig({
  plugins: [
    // SWC plugin enables emitDecoratorMetadata support that TypeORM requires.
    // Vitest's default esbuild transform strips decorator metadata.
    swc.vite(),
  ],
  resolve: {
    alias: {
      shared: path.resolve(__dirname, '../shared/src/index.ts'),
      '@test': path.resolve(__dirname, 'src/__tests__'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{unit,integration}.ts'],
    setupFiles: ['./src/test-setup.ts'],
    reporters: ['default', 'json'],
    outputFile: {
      json: '../reports/backend/test-results.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: '../reports/backend/coverage',
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
    },
  },
});

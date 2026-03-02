import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['default', 'json'],
    outputFile: {
      json: '../reports/shared/test-results.json',
    },
    coverage: {
      provider: 'v8',
      reporter: [
        'text',                                       // console output when running
        'html',                                       // friendly HTML UI (served via coverage:view)
        'json-summary',                              // machine-readable summary
        ['text', { file: 'coverage-summary.txt' }],  // text artifact in reports/shared/coverage/
      ],
      reportsDirectory: '../reports/shared/coverage',
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts'],
    },
  },
});

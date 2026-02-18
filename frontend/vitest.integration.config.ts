import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vite.config';

/**
 * Vitest configuration for integration tests only.
 * Matches files ending in .test.integration.ts or .test.integration.tsx
 */
export default mergeConfig(baseConfig, defineConfig({
  test: {
    include: ['src/**/*.test.integration.{ts,tsx}'],
    exclude: ['src/**/*.test.unit.{ts,tsx}'],
    outputFile: {
      json: '../reports/frontend/integration-test-results.json',
    },
    testTimeout: 10000,
  },
}));

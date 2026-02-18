import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

/**
 * Vitest configuration for unit tests only.
 * Matches files ending in .test.unit.ts
 */
export default mergeConfig(baseConfig, defineConfig({
  test: {
    include: ['src/**/*.test.unit.ts'],
    exclude: ['src/**/*.test.integration.ts'],
    outputFile: {
      json: '../reports/backend/unit-test-results.json',
    },
  },
}));

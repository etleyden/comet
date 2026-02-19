import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vitest.config';

/**
 * Vitest configuration for integration tests only.
 * Matches files ending in .test.integration.ts
 */
export default mergeConfig(baseConfig, defineConfig({
  test: {
    include: ['src/**/*.test.integration.ts'],
    exclude: ['src/**/*.test.unit.ts'],
    outputFile: {
      json: '../reports/backend/integration-test-results.json',
    },
    // Integration tests may need longer timeouts for DB + container operations
    testTimeout: 15000,
    hookTimeout: 30000,
  },
}));

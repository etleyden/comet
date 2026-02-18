import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from './vite.config';

/**
 * Vitest configuration for unit tests only.
 * Matches files ending in .test.unit.ts or .test.unit.tsx
 */
export default mergeConfig(baseConfig, defineConfig({
  test: {
    include: ['src/**/*.test.unit.{ts,tsx}'],
    exclude: ['src/**/*.test.integration.{ts,tsx}'],
    outputFile: {
      json: '../reports/frontend/unit-test-results.json',
    },
  },
}));

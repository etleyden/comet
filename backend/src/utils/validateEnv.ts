/**
 * Validates that all required environment variables are set.
 * Calls process.exit(1) with a clear error listing every missing var
 * if any are absent — rather than letting the app crash cryptically later.
 *
 * Call this once, early in index.ts, before any other initialization.
 */
export function validateEnv(required: string[]): void {
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('\n[startup] Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('\nCopy .env.example to .env and fill in the required values.\n');
    process.exit(1);
  }
}

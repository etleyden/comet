#!/usr/bin/env node
/**
 * Setup script for the development environment
 * - Copies .env.example to .env if it doesn't exist
 * - Prompts for initial admin user credentials
 * - Generates SSL certificates for HTTPS
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline/promises');

const rootDir = path.join(__dirname, '..');
const certsDir = path.join(rootDir, 'certs');
const envExample = path.join(rootDir, '.env.example');
const envFile = path.join(rootDir, '.env');

/**
 * Reads a .env file and returns a map of key → raw line (preserves comments/blanks).
 * Returns { lines: string[], keys: Map<string, number> } where keys maps env var
 * names to their line index.
 */
function parseEnvFile(filePath) {
  const lines = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf8').split('\n')
    : [];
  const keys = new Map();
  lines.forEach((line, i) => {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (match) keys.set(match[1], i);
  });
  return { lines, keys };
}

/** Writes key=value into the parsed env structure (upserts). */
function setEnvVar(parsed, key, value) {
  const entry = `${key}=${value}`;
  if (parsed.keys.has(key)) {
    parsed.lines[parsed.keys.get(key)] = entry;
  } else {
    parsed.lines.push(entry);
    parsed.keys.set(key, parsed.lines.length - 1);
  }
}

/** Prompts and returns trimmed input; re-prompts if required and empty. */
async function prompt(rl, question, { required = false, defaultValue = '' } = {}) {
  const hint = defaultValue ? ` [${defaultValue}]` : required ? ' (required)' : '';
  while (true) {
    const answer = (await rl.question(`  ${question}${hint}: `)).trim();
    if (answer) return answer;
    if (defaultValue) return defaultValue;
    if (!required) return '';
    console.log('  ⚠ This field is required.');
  }
}

async function main() {
  console.log('🚀 Setting up development environment...\n');

  // ── Step 1: .env file ───────────────────────────────────────────────
  console.log('📋 Checking environment file...');
  if (!fs.existsSync(envFile)) {
    if (fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envFile);
      console.log('✓ Created .env from .env.example');
    } else {
      console.warn('⚠ Warning: .env.example not found. Skipping environment file creation.');
    }
  } else {
    console.log('✓ .env already exists');
  }

  // ── Step 2: Admin user credentials ─────────────────────────────────
  console.log('\n👤 Admin user configuration...');
  const parsed = parseEnvFile(envFile);

  const alreadyConfigured =
    parsed.keys.has('ADMIN_EMAIL') &&
    parsed.keys.has('ADMIN_NAME');

  if (alreadyConfigured) {
    const emailLine = parsed.lines[parsed.keys.get('ADMIN_EMAIL')];
    const currentEmail = emailLine.split('=')[1] ?? '';
    console.log(`✓ Admin user already set (${currentEmail})`);
    console.log('  To change, edit ADMIN_NAME / ADMIN_EMAIL in .env');
  } else {
    console.log('Configure an initial admin account (leave blank to skip).');
    console.log('  A temporary password will be printed to the console on first server start.\n');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const email = await prompt(rl, 'Admin email');
      if (email) {
        const name = await prompt(rl, 'Admin display name', { required: true, defaultValue: 'Admin' });

        setEnvVar(parsed, 'ADMIN_NAME', name);
        setEnvVar(parsed, 'ADMIN_EMAIL', email);

        fs.writeFileSync(envFile, parsed.lines.join('\n'));
        console.log(`\n✓ Admin user saved to .env (${email})`);
        console.log('  A temporary password will be generated on first server start.');
      } else {
        console.log('  Skipped. You can set ADMIN_NAME and ADMIN_EMAIL in .env later.');
      }
    } finally {
      rl.close();
    }
  }

  // ── Step 3: SSL certificates ────────────────────────────────────────
  console.log('\n🔐 Setting up SSL certificates...');
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
    console.log('✓ Created certs directory');
  }

  const keyPath = path.join(certsDir, 'localhost-key.pem');
  const certPath = path.join(certsDir, 'localhost-cert.pem');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('✓ SSL certificates already exist');
    console.log('\n✅ Setup complete!');
    return;
  }

  console.log('Generating locally-trusted SSL certificates with mkcert...');
  try {
    try {
      execSync('mkcert -version', { stdio: 'ignore' });
    } catch {
      console.error('\n❌ Error: mkcert is not installed or not in PATH');
      console.error('\nmkcert creates locally-trusted development certificates.');
      console.error('Install mkcert:');
      console.error('  - Windows: choco install mkcert (then run: mkcert -install)');
      console.error('  - Windows (manual): https://github.com/FiloSottile/mkcert/releases');
      console.error('  - macOS: brew install mkcert (then run: mkcert -install)');
      console.error('  - Linux: See https://github.com/FiloSottile/mkcert#installation');
      console.error('\nAfter installing, run: mkcert -install');
      console.error('Then run this setup script again.');
      process.exit(1);
    }

    console.log('Generating certificates...');
    execSync(
      `mkcert -key-file "${keyPath}" -cert-file "${certPath}" localhost 127.0.0.1 ::1 backend frontend`,
      { cwd: certsDir, stdio: 'inherit' }
    );

    console.log('\n✓ SSL certificates generated successfully!');
    console.log('  - localhost-key.pem');
    console.log('  - localhost-cert.pem');

    const gitignoreContent = `# Ignore all certificate files\n*.pem\n*.key\n*.crt\n*.conf\n!.gitignore\n`;
    fs.writeFileSync(path.join(certsDir, '.gitignore'), gitignoreContent);

    console.log('\n✅ Setup complete!');
    console.log('\nYour development certificates are now trusted by your system.');
    console.log('No browser security warnings! 🎉');
  } catch (error) {
    console.error('\n❌ Error generating certificates:', error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

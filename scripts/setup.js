#!/usr/bin/env node
/**
 * Setup script for the development environment
 * - Generates SSL certificates for HTTPS
 * - Copies .env.example to .env if it doesn't exist
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const certsDir = path.join(rootDir, 'certs');
const envExample = path.join(rootDir, '.env.example');
const envFile = path.join(rootDir, '.env');

console.log('🚀 Setting up development environment...\n');

// Step 1: Copy .env.example to .env if it doesn't exist
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

// Step 2: Create certs directory if it doesn't exist
console.log('\n🔐 Setting up SSL certificates...');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
  console.log('✓ Created certs directory');
}

// Check if certificates already exist
const keyPath = path.join(certsDir, 'localhost-key.pem');
const certPath = path.join(certsDir, 'localhost-cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('✓ SSL certificates already exist');
  console.log('\n✅ Setup complete!');
  process.exit(0);
}

// Step 3: Generate SSL certificates using mkcert
console.log('Generating locally-trusted SSL certificates with mkcert...');

try {
  // Check if mkcert is available
  try {
    execSync('mkcert -version', { stdio: 'ignore' });
  } catch (error) {
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

  // Generate certificates for localhost
  console.log('Generating certificates...');
  execSync(
    `mkcert -key-file "${keyPath}" -cert-file "${certPath}" localhost 127.0.0.1 ::1 backend frontend`,
    { cwd: certsDir, stdio: 'inherit' }
  );

  console.log('\n✓ SSL certificates generated successfully!');
  console.log('  - localhost-key.pem');
  console.log('  - localhost-cert.pem');

  // Create .gitignore in certs directory
  const gitignoreContent = `# Ignore all certificate files
*.pem
*.key
*.crt
*.conf
!.gitignore
`;
  fs.writeFileSync(path.join(certsDir, '.gitignore'), gitignoreContent);

  console.log('\n✅ Setup complete!');
  console.log('\nYour development certificates are now trusted by your system.');
  console.log('No browser security warnings! 🎉');
} catch (error) {
  console.error('\n❌ Error generating certificates:', error.message);
  process.exit(1);
}

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

// Step 3: Generate SSL certificates using openssl
console.log('Generating self-signed SSL certificates...');

try {
  // Check if openssl is available
  try {
    execSync('openssl version', { stdio: 'ignore' });
  } catch (error) {
    console.error('\n❌ Error: OpenSSL is not installed or not in PATH');
    console.error('Please install OpenSSL:');
    console.error('  - Windows: https://slproweb.com/products/Win32OpenSSL.html');
    console.error('  - macOS: brew install openssl');
    console.error('  - Linux: sudo apt-get install openssl (or equivalent)');
    process.exit(1);
  }

  // Create OpenSSL config file
  const configContent = `[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C = US
ST = Development
L = Local
O = Development
OU = Development
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = backend
DNS.3 = frontend
DNS.4 = *.localhost
IP.1 = 127.0.0.1
IP.2 = 0.0.0.0
`;

  const configPath = path.join(certsDir, 'localhost.conf');
  fs.writeFileSync(configPath, configContent);

  // Generate private key
  execSync(
    `openssl genrsa -out "${keyPath}" 2048`,
    { stdio: 'inherit' }
  );

  // Generate certificate
  execSync(
    `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -config "${configPath}" -extensions v3_req`,
    { stdio: 'inherit' }
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
  console.log('\nNote: Your browser will show a security warning for self-signed certificates.');
  console.log('This is expected for local development - you can safely proceed past the warning.');

} catch (error) {
  console.error('\n❌ Error generating certificates:', error.message);
  process.exit(1);
}

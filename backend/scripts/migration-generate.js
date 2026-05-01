const { execSync } = require('child_process');

const name = process.env.npm_config_name;

if (!name) {
  console.error('Error: migration name is required.');
  console.error('Usage: npm run migration:generate --name=<MigrationName>');
  process.exit(1);
}

execSync(
  `typeorm-ts-node-commonjs migration:generate src/migrations/${name} -d src/data-source.ts`,
  { stdio: 'inherit' }
);

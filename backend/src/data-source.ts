import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { entities } from './entities';

// Only load .env file in development — in production, env vars come from the
// deployment platform (Docker environment: / Coolify settings).
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: '../.env' });
}

const isProduction = process.env.NODE_ENV === 'production';

// Configure the TypeORM DataSource
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: !isProduction,
  migrationsRun: isProduction,
  logging: isProduction ? ['error', 'warn', 'migration'] : true,
  entities: entities,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});

export const getDB = () => AppDataSource.manager;

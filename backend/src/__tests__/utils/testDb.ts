/**
 * Test database utilities for connecting to the PostgreSQL testcontainer.
 *
 * The global setup (globalSetup.ts) starts the container and writes connection
 * details to a JSON file. This module reads that file and manages a TypeORM
 * DataSource against it.
 *
 * Usage in test files:
 *   import { setupTestDb, getTestDB, resetTestDb, teardownTestDb } from '@test/utils/testDb';
 *
 *   vi.mock('../data-source', async () => {
 *     const testDb = await import('@test/utils/testDb');
 *     return { getDB: () => testDb.getTestDB() };
 *   });
 *
 *   beforeAll(() => setupTestDb());
 *   beforeEach(() => resetTestDb());
 *   afterAll(() => teardownTestDb());
 */
import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DataSource, type EntityManager } from 'typeorm';
import { entities } from '../../entities';

const CONFIG_PATH = join(__dirname, '..', '.testdb.json');

let dataSource: DataSource | null = null;

/**
 * Initialise a TypeORM DataSource connected to the testcontainer.
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export async function setupTestDb(): Promise<DataSource> {
    if (dataSource?.isInitialized) return dataSource;

    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));

    dataSource = new DataSource({
        type: 'postgres',
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        database: config.database,
        synchronize: true,
        logging: false,
        entities,
        // Drop & recreate schema on first connection so every test run starts clean
        dropSchema: true,
    });

    await dataSource.initialize();
    return dataSource;
}

/** Return the TypeORM DataSource. Throws if not yet initialised. */
export function getTestDataSource(): DataSource {
    if (!dataSource?.isInitialized) {
        throw new Error('Test DB not initialised – call setupTestDb() in beforeAll first');
    }
    return dataSource;
}

/** Return the TypeORM EntityManager (equivalent to production getDB()). */
export function getTestDB(): EntityManager {
    return getTestDataSource().manager;
}

/**
 * Truncate every table so each test starts with a blank database.
 * Uses TRUNCATE … CASCADE to handle foreign-key relationships.
 */
export async function resetTestDb(): Promise<void> {
    if (!dataSource?.isInitialized) return;

    const tableNames = dataSource.entityMetadatas
        .map((e) => `"${e.tableName}"`)
        .join(', ');

    if (tableNames) {
        await dataSource.query(`TRUNCATE TABLE ${tableNames} CASCADE`);
    }
}

/** Destroy the DataSource connection (the container itself is managed by globalSetup). */
export async function teardownTestDb(): Promise<void> {
    if (dataSource?.isInitialized) {
        await dataSource.destroy();
        dataSource = null;
    }
}

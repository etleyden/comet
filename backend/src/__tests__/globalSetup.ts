/**
 * Vitest global setup that starts a PostgreSQL container via testcontainers.
 * The container is shared across ALL test files in a single test run.
 *
 * Connection details are written to a temporary JSON file so each test worker
 * (even in a forked/threaded pool) can connect to the same database.
 */
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

export const TEST_DB_CONFIG_PATH = join(__dirname, '.testdb.json');

let container: StartedPostgreSqlContainer;

export async function setup() {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    const config = {
        host: container.getHost(),
        port: container.getPort(),
        username: container.getUsername(),
        password: container.getPassword(),
        database: container.getDatabase(),
    };

    writeFileSync(TEST_DB_CONFIG_PATH, JSON.stringify(config));
}

export async function teardown() {
    await container?.stop();
    try {
        unlinkSync(TEST_DB_CONFIG_PATH);
    } catch {
        // file may already be gone
    }
}

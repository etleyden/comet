# Database Migrations

Comet uses [TypeORM migrations](https://typeorm.io/migrations) to manage database schema changes. Migrations are the **only** way schema changes reach production — the `synchronize` option is disabled for production builds.

## How It Works

| Environment     | Schema Strategy                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Development** | `synchronize: true` — TypeORM auto-syncs entities to the DB on startup. Migrations are **not** required during local dev.               |
| **Production**  | `migrationsRun: true` — TypeORM runs all pending migrations automatically on application startup (during `AppDataSource.initialize()`). |

Migration files live in `backend/src/migrations/` and are compiled to JavaScript alongside the rest of the backend during the Docker build. The compiled migrations are what TypeORM executes in production.

## Available Scripts

Run these from the `backend/` directory (or use `npm --prefix backend run <script>` from the project root):

| Script                                            | Description                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `npm run migration:generate --name=MigrationName` | Auto-generate a migration by diffing entities against the current DB schema |
| `npm run migration:run`                           | Execute all pending migrations                                              |
| `npm run migration:revert`                        | Revert the most recently executed migration                                 |
| `npm run migration:show`                          | List all migrations and their status (applied or pending)                   |

## Workflow: Making a Schema Change

### 1. Update the Entity

Edit or create entity files in `backend/src/entities/`. If adding a new entity, export it from `backend/src/entities/index.ts` and the file will be auto-detected by TypeORM.

### 2. Let Synchronize Update Your Local DB

In development, `synchronize: true` applies your entity changes to the local database automatically on the next server restart. Verify your schema looks correct before proceeding.

### 3. Generate the Migration

Once you're happy with the entity changes, generate a migration that captures the diff:

```bash
cd backend
npm run migration:generate --name=AddUserProfileFields
```

This compares your entities against the **current database schema** and produces a timestamped migration file in `backend/src/migrations/`, for example:

```
src/migrations/1774317708102-AddUserProfileFields.ts
```

> **Important:** The TypeORM CLI connects to your local database to compute the diff. Make sure Docker Compose is running (`docker compose up postgres`) and your `.env` file has valid `DB_*` credentials.

### 4. Review the Migration

Open the generated file and verify the SQL statements in `up()` and `down()`:

- `up()` — applies the change (e.g., `ALTER TABLE`, `CREATE TABLE`)
- `down()` — reverts the change (should be the exact inverse of `up()`)

TypeORM auto-generates these, but always review them — especially for destructive operations like dropping columns.

### 5. Test the Migration Locally

Run the migration against your local database to confirm it works:

```bash
npm run migration:run
```

To verify it applied:

```bash
npm run migration:show
# [X] AddUserProfileFields1774317708102   ← marked as applied
```

To test the rollback:

```bash
npm run migration:revert
```

### 6. Commit and Deploy

Commit the migration file along with your entity changes. On the next production deployment, the migration runs automatically during app startup.

## How Production Migrations Execute

1. Docker builds the backend, compiling TypeScript (including migrations) to JavaScript in `dist/`.
2. The production container starts with `node dist/backend/src/index.js`.
3. `AppDataSource.initialize()` runs with `migrationsRun: true`.
4. TypeORM checks the `migrations` table in PostgreSQL for already-applied migrations.
5. Any pending migrations are executed in timestamp order.
6. If the `user` table doesn't exist after migrations, the app exits with an error.

## Guidelines

- **One migration per PR**: Keep each migration focused on one logical change.
- **Never edit a migration that has been deployed**: If a migration has already run in production, create a new migration to fix issues.
- **Keep migrations reversible**: Always implement `down()` so you can rollback if needed.
- **Don't rely on `synchronize` for production changes**: It can cause data loss and doesn't provide rollback capability.
- **Test both `up` and `down`**: Run `migration:run` then `migration:revert` locally to verify both directions work.

## Troubleshooting

### "Cannot find module 'shared'" when running migration commands

The TypeORM CLI uses `ts-node` which requires `tsconfig-paths` to resolve path aliases. Make sure dependencies are installed:

```bash
npm install   # from project root
```

### Migration generates an empty file

This means your entities match the current database schema — there's nothing to migrate. This can happen if `synchronize: true` already applied your changes in dev. The migration is still valid (it's a no-op).

### Migration fails in production

Check the application logs for the specific SQL error. Common causes:

- A column was renamed instead of added/dropped (TypeORM generates DROP + CREATE, which loses data)
- A migration depends on data that doesn't exist yet
- A previous migration was manually edited after deployment

To check migration status in production, connect to the database and query:

```sql
SELECT * FROM migrations ORDER BY timestamp;
```

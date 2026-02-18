# Writing Backend Tests

Tests live co-located with the source files they cover and follow the naming convention:

```
src/services/userService.ts           ← source
src/services/userService.test.unit.ts ← unit tests
src/routes/userRoutes.test.integration.ts ← integration tests
```

Run commands from `backend/`:

| Command | Runs |
|---------|------|
| `npm test` | All tests |
| `npm run test:unit` | Only `*.test.unit.ts` files |
| `npm run test:integration` | Only `*.test.integration.ts` files |

---

## Test infrastructure

### `src/__tests__/fixtures/` — shared test data

Typed fixture objects that represent common database entities. Import them instead of
re-declaring test users and accounts in every file.

```ts
import { testUser, testUser2, testAccount, TEST_PASSWORD } from '@test/fixtures';
// @test is an alias to src/__tests__/ configured in vitest.config.ts
```

Available exports from `@test/fixtures`:

| Export | Type | Description |
|--------|------|-------------|
| `testUser` | `User` | A standard authenticated user |
| `testUser2` | `User` | A second user for multi-user scenarios |
| `testLoginCredentials` | `LoginRequest` | Email + password matching `testUser` |
| `testRegisterData` | `RegisterRequest` | Valid registration payload for a new user |
| `TEST_PASSWORD` | `string` | The plaintext password used in `testLoginCredentials` |
| `testAccount` | `Account` | A primary bank account owned by `testUser` |
| `testAccount2` | `Account` | A second account |
| `testCreateAccountData` | `CreateAccountRequest` | A valid payload for creating a new account |

### `src/__tests__/mocks/` — database mock factory

```ts
import { createMockEntityManager, createMockQueryBuilder } from '@test/mocks';
```

**`createMockEntityManager()`** returns an object that mimics TypeORM's `EntityManager`.
All methods (`save`, `findOneBy`, `findOne`, `find`, `delete`, `createQueryBuilder`) are
`vi.fn()` stubs you can program per-test.

**`createMockQueryBuilder()`** returns a chainable mock where every builder method
(`.select()`, `.where()`, `.innerJoin()`, etc.) returns `this` so chains don't throw.
Terminal methods (`getOne`, `getMany`, `execute`, `getCount`) are plain `vi.fn()` stubs.

### `src/__tests__/utils/testApp.ts` — full Express app for integration tests

```ts
import { createTestApp } from '@test/utils/testApp';
```

Builds a real Express application with all middleware and routes registered — identical
to the production setup but without HTTPS or database initialisation. Use this with
[supertest](https://github.com/ladjs/supertest) to make HTTP requests in integration tests.

---

## Unit tests

Unit tests cover a single class or function in isolation. Every dependency that touches
the database is replaced by `vi.mock()` stubs so no real database connection is needed.

### Pattern

```ts
// 1. Mock the module that provides the DB connection BEFORE any imports that use it
vi.mock('../data-source', () => ({
  getDB: vi.fn(),
}));

// 2. Import after the mock declaration to get the mocked version
import { getDB } from '../data-source';
const mockedGetDB = vi.mocked(getDB);

// 3. Wire up a fresh mock DB before each test
beforeEach(() => {
  mockDB = createMockEntityManager();
  mockedGetDB.mockReturnValue(mockDB as any);
  vi.clearAllMocks(); // reset call history
});
```

### Example: testing `UserService`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './userService';
import { createMockEntityManager } from '@test/mocks';
import { testUser, TEST_PASSWORD } from '@test/fixtures';

vi.mock('../data-source', () => ({ getDB: vi.fn() }));
import { getDB } from '../data-source';
const mockedGetDB = vi.mocked(getDB);

describe('UserService', () => {
  let userService: UserService;
  let mockDB: ReturnType<typeof createMockEntityManager>;

  beforeEach(() => {
    userService = new UserService();
    mockDB = createMockEntityManager();
    mockedGetDB.mockReturnValue(mockDB as any);
    vi.clearAllMocks();
  });

  it('should throw if user with email already exists', async () => {
    // Simulate: the DB already has a user with this email
    mockDB.findOneBy.mockResolvedValue(testUser);

    await expect(
      userService.createUser('Test', testUser.email, TEST_PASSWORD)
    ).rejects.toThrow('User with this email already exists');
  });

  it('should save a new user when email is not taken', async () => {
    // Simulate: no existing user found, then DB returns the saved user
    mockDB.findOneBy.mockResolvedValue(null);
    mockDB.save.mockResolvedValue({ ...testUser, passwordHash: 'hashed' });

    const result = await userService.createUser(testUser.name, testUser.email, TEST_PASSWORD);

    expect(mockDB.save).toHaveBeenCalledTimes(1);
    expect(result.email).toBe(testUser.email);
  });
});
```

### Programming mock return values

| Method | What it does |
|--------|--------------|
| `mockDB.findOneBy.mockResolvedValue(null)` | The next (and all future) calls return `null` |
| `mockDB.findOneBy.mockResolvedValue(testUser)` | All calls return `testUser` |
| `mockDB.findOneBy.mockResolvedValueOnce(null).mockResolvedValueOnce(testUser)` | First call → `null`, second call → `testUser` |
| `mockDB.save.mockResolvedValue(savedEntity)` | `save()` resolves to `savedEntity` |
| `mockDB.save.mockRejectedValue(new Error('DB error'))` | `save()` rejects — use to test error handling |
| `mockDB.createQueryBuilder.mockReturnValue(customQB)` | Replace the default query builder with a custom one |

Use `mockResolvedValueOnce` chaining whenever a method is called multiple times with
different results in a single code path. For example, `createUser` → `createSession`
both call `findOneBy` in sequence:

```ts
mockDB.findOneBy
  .mockResolvedValueOnce(null)       // 1st call: email check → no existing user
  .mockResolvedValueOnce(savedUser); // 2nd call: session validation → found user
```

### Mocking query builder methods

When the service uses `createQueryBuilder()`, create a minimal stub with only the
methods that code path actually calls:

```ts
const mockQB = {
  addSelect: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  getOne: vi.fn().mockResolvedValue({ ...testUser, passwordHash: hash }),
};
mockDB.createQueryBuilder.mockReturnValue(mockQB as any);
```

Every builder method returns `this` (via `.mockReturnThis()`) so the chain doesn't
throw. The terminal method (`getOne`, `getMany`) returns the data you want.

---

## Integration tests

Integration tests verify that the HTTP layer (routing, middleware, validation, error
handling) works correctly end-to-end. They use a real Express app and real HTTP
requests via supertest, but still mock the database.

### Pattern

```ts
import request from 'supertest';
import { createTestApp } from '@test/utils/testApp';

vi.mock('../data-source', () => ({ getDB: vi.fn() }));
import { getDB } from '../data-source';
const mockedGetDB = vi.mocked(getDB);

describe('My Route (Integration)', () => {
  const app = createTestApp(); // create once — Express app is stateless
  let mockDB: Record<string, any>;

  beforeEach(() => {
    mockDB = { save: vi.fn(), findOneBy: vi.fn(), findOne: vi.fn(), /* ... */ };
    mockedGetDB.mockReturnValue(mockDB as any);
    vi.clearAllMocks();
  });

  it('should return 200 with valid input', async () => {
    mockDB.findOneBy.mockResolvedValue(null); // set up DB state
    mockDB.save.mockResolvedValue({ id: '123', ...data });

    const response = await request(app)
      .post('/some/route')
      .send({ name: 'Test' })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

### Testing authenticated routes

Routes protected by `requireAuth()` check the `session` cookie and look up the session
in the database via `mockDB.findOne`. Provide a session cookie and make `findOne`
return a valid session object:

```ts
// SHA-256 of the string "secret", base64-encoded — matches the cookie value below
const TEST_SESSION_SECRET_HASH = 'K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=';

function mockAuthenticatedUser(mockDB: Record<string, any>) {
  mockDB.findOne.mockResolvedValue({
    id: 'test-session-id',
    secretHash: TEST_SESSION_SECRET_HASH,
    createdAt: new Date(),
    user: testUser,
  });
}

it('should create an account when authenticated', async () => {
  mockAuthenticatedUser(mockDB); // session lookup will succeed

  const response = await request(app)
    .post('/api/accounts')
    .set('Cookie', 'session=test-session-id.secret') // matching cookie
    .send(testCreateAccountData)
    .expect(200);

  expect(response.body.success).toBe(true);
});
```

The cookie format is `session=<id>.<secret>`. The auth middleware hashes `<secret>`
with SHA-256 and compares it to `secretHash` stored in the session record. Using a
fixed pre-computed hash keeps tests deterministic without running the real hash
function at setup time.

### What integration tests are responsible for

| ✅ Test here | ❌ Don't test here |
|-------------|-------------------|
| HTTP status codes | Business logic inside services |
| Request body validation (Zod errors → 400) | Password hashing correctness |
| Auth middleware behaviour (401 on missing cookie) | Complex DB query logic |
| Response shape (`success`, `data`, `error`) | Edge cases already covered by unit tests |
| Route registration and middleware ordering | |

# Writing Frontend Tests

Tests live co-located with the source files they cover and follow the naming convention:

```
src/components/accounts/AccountSelection.tsx                    ← source
src/components/accounts/AccountSelection.test.unit.tsx          ← unit tests
src/components/accounts/AccountSelection.test.integration.tsx   ← integration tests
```

Run commands from `frontend/`:

| Command | Runs |
|---------|------|
| `npm test` | All tests |
| `npm run test:unit` | Only `*.test.unit.{ts,tsx}` files |
| `npm run test:integration` | Only `*.test.integration.{ts,tsx}` files |

---

## Test infrastructure

### `src/__tests__/fixtures/` — shared test data

Typed fixture objects matching the `shared` package types. Import them instead of
re-declaring test entities in every file.

```ts
import { testUser, testAccount, testAccount2 } from '../__tests__/fixtures';
// or relative: '../../__tests__/fixtures' depending on depth
```

Available exports:

| Export | Type | Description |
|--------|------|-------------|
| `testUser` | `User` | A standard authenticated user |
| `testUser2` | `User` | A second user for multi-user scenarios |
| `testAccount` | `Account` | A primary bank account |
| `testAccount2` | `Account` | A second account |
| `testLoginCredentials` | `LoginRequest` | Email + password matching `testUser` |
| `testRegisterData` | `RegisterRequest` | Valid registration payload for a new user |
| `TEST_PASSWORD` | `string` | The plaintext password used in `testLoginCredentials` |
| `testCreateAccountData` | `CreateAccountRequest` | A valid account creation payload |

### `src/__tests__/mocks/` — MSW server and request handlers

[MSW (Mock Service Worker)](https://mswjs.io/) intercepts outgoing `fetch()` calls at
the network level. Your production API client code runs as normal — MSW catches requests
before they leave the process and returns controlled responses.

```ts
import { server } from '../../__tests__/mocks/server';
// Adjust the relative path to match the depth of your test file
```

The `handlers` array in `src/__tests__/mocks/handlers.ts` defines happy-path defaults:

| Request | Default response |
|---------|-----------------|
| `POST /auth/register` | `{ success: true, data: { ...testUser, token: 'mock-session-token' } }` |
| `POST /api/auth/login` | `{ success: true, data: { ...testUser, token: 'mock-session-token' } }` |
| `POST /api/auth/logout` | `{ success: true, data: { success: true } }` |
| `GET /auth/me` | `{ success: true, data: testUser }` |
| `GET /api/accounts` | `{ success: true, data: [testAccount, testAccount2] }` |
| `POST /api/accounts` | Echoes request body as a new `Account` |
| `GET /health` | `{ status: 'ok' }` |

Individual tests can override a handler for one scenario by calling `server.use(...)`.
`server.resetHandlers()` removes overrides after each test.

---

## Unit tests

Unit tests cover one component's rendering logic, conditional UI states, and prop
handling — in complete isolation. Every external dependency (API calls, context hooks,
sibling modules) is replaced with a `vi.mock()` stub so the test controls all inputs.

### Pattern: mocking an API module

```ts
// 1. Declare the mock before any imports that trigger the real module
vi.mock('../../../api', () => ({
  accountsApi: {
    getAccounts: vi.fn(),
  },
}));

// 2. Import after the mock to get the typed mock version
import { accountsApi } from '../../../api';
const mockedGetAccounts = vi.mocked(accountsApi.getAccounts);
```

### Pattern: mocking a React context hook

```ts
const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));
```

### Programming mock return values

| Method | What it simulates |
|--------|-------------------|
| `mock.mockReturnValue(new Promise(() => {}))` | Infinite loading state (never resolves) |
| `mock.mockResolvedValue({ success: true, data: [...] })` | Successful API response |
| `mock.mockResolvedValue({ success: false, error: 'msg' })` | API-level error response |
| `mock.mockRejectedValue(new Error('Network error'))` | Thrown exception (network failure) |

### Full example: `AccountSelection.test.unit.tsx`

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import AccountSelection from './AccountSelection';

vi.mock('../../../api', () => ({
  accountsApi: { getAccounts: vi.fn() },
}));
import { accountsApi } from '../../../api';
const mockedGetAccounts = vi.mocked(accountsApi.getAccounts);

function renderAccountSelection(props = {}) {
  return render(
    <ThemeProvider theme={theme}>
      <AccountSelection value="" onChange={vi.fn()} {...props} />
    </ThemeProvider>
  );
}

describe('AccountSelection', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows a disabled select while loading', () => {
    mockedGetAccounts.mockReturnValue(new Promise(() => {})); // never resolves

    renderAccountSelection();

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows an error when the API returns a failure', async () => {
    mockedGetAccounts.mockResolvedValue({ success: false, error: 'Failed to load' });

    renderAccountSelection();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load');
    });
  });

  it('enables the select after accounts load successfully', async () => {
    mockedGetAccounts.mockResolvedValue({
      success: true,
      data: [{ id: '1', name: 'Checking', account: '1234', routing: '5678' }],
    });

    renderAccountSelection();

    await waitFor(() => {
      expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-disabled', 'true');
    });
  });
});
```

### What unit tests are responsible for

| ✅ Test here | ❌ Don't test here |
|-------------|-------------------|
| Conditional rendering (loading / error / success states) | That the real API client sends the correct HTTP request |
| Prop-driven UI variations (labels, placeholders, disabled state) | Auth flow integration |
| Hook mock combinations (e.g. `isLoading: true` + `isAuthenticated: false`) | Multiple components working together |
| Edge cases: empty arrays, long strings, missing optional props | Anything requiring a real network response |

---

## Integration tests

Integration tests verify the component's full data flow: it renders → triggers `useEffect`
→ the real API client calls `fetch()` → MSW intercepts and responds → state updates →
the UI re-renders. Nothing is mocked at the module level.

### MSW server lifecycle

Every integration test file must manage the server:

```ts
import { server } from '../../__tests__/mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers()); // clear per-test overrides
afterAll(() => server.close());
```

`onUnhandledRequest: 'error'` is recommended — it fails the test loudly if a request
goes out that no handler matches, catching missing handler bugs early.

### Using the default handlers

By default the MSW server returns happy-path data. A test that doesn't need to
customise the response just renders the component and waits:

```tsx
it('should fetch and display accounts from the API', async () => {
  renderAccountSelection();

  // Loading state while fetch is in flight
  expect(screen.getByRole('combobox')).toHaveAttribute('aria-disabled', 'true');

  // MSW responds with [testAccount, testAccount2] — component becomes enabled
  await waitFor(() => {
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-disabled', 'true');
  });
});
```

### Overriding a handler for one test

Use `server.use(...)` to push a temporary handler that takes priority over the defaults.
It is automatically removed by `server.resetHandlers()` in `afterEach`.

```tsx
import { http, HttpResponse } from 'msw';
import type { ApiResponse, Account } from 'shared';

it('should show an error when the API returns a failure response', async () => {
  server.use(
    http.get('https://localhost:86/api/accounts', () => {
      const response: ApiResponse<Account[]> = {
        success: false,
        error: 'Unauthorized access',
      };
      return HttpResponse.json(response);
    })
  );

  renderAccountSelection();

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('Unauthorized access');
  });
});
```

### Simulating a network failure

```tsx
it('should show an error when the network request fails', async () => {
  server.use(
    http.get('https://localhost:86/api/accounts', () => HttpResponse.error())
  );

  renderAccountSelection();

  await waitFor(() => {
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
```

### Adding a new handler to the defaults

If you add a new API endpoint and write integration tests for it, add a default
happy-path handler to `src/__tests__/mocks/handlers.ts`:

```ts
import { http, HttpResponse } from 'msw';

http.get('https://localhost:86/api/transactions', () => {
  const response: ApiResponse<Transaction[]> = {
    success: true,
    data: [testTransaction],
  };
  return HttpResponse.json(response);
}),
```

Then add the corresponding fixture data to `src/__tests__/fixtures/entities.ts`.

### What integration tests are responsible for

| ✅ Test here | ❌ Don't test here |
|-------------|-------------------|
| The component correctly renders data returned by the API | Rendering variations already covered by unit tests |
| Error states caused by real API failure shapes | Internal implementation details |
| Behaviour that requires multiple state transitions driven by real async flow | Components other than the one under test |
| That the correct endpoint is called | Whether the API server correctly handles the request |

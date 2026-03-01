# Agents Guide: Comet

This document provides AI coding agents with essential context about the Comet project to enable effective, autonomous contributions.

## Project Overview

**Comet** is a personal finance application for tracking transactions and providing extensive analytics for data-focused users. It's a full-stack TypeScript application with React frontend, Express backend, and PostgreSQL database.

**Key Features:**
- User authentication with session management
- Multi-account management (link multiple bank accounts to a user)
- CSV transaction file uploads with interactive column mapping
- Transaction storage with amounts, dates, status, categories, and raw source data
- User-defined transaction categories

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + Vite + Material-UI |
| **Backend** | Express.js + TypeScript + TypeORM |
| **Database** | PostgreSQL 17 |
| **Testing** | Vitest + React Testing Library + MSW (frontend), Vitest + Supertest (backend) |
| **Development** | Docker Compose + HTTPS (mkcert for local SSL) |
| **Package Management** | npm workspaces (monorepo with `backend/`, `frontend/`, `shared/`) |

## Architecture

### Monorepo Structure

```
comet/
├── backend/          # Express API server
├── frontend/         # React SPA
├── shared/           # Shared TypeScript types between frontend/backend
├── __tests__/        # Shared test utilities and fixtures
├── docs/             # Developer documentation
└── scripts/          # Setup and utility scripts
```

### Backend Architecture

```
backend/src/
├── entities/         # TypeORM entity models (User, Account, Transaction, etc.)
├── routes/           # Express route handlers
├── services/         # Business logic layer
├── middleware/       # Express middleware (auth, error handling)
├── utils/            # Helper functions
├── types/            # TypeScript type definitions
├── data-source.ts    # TypeORM DataSource configuration
└── index.ts          # Application entry point
```

**Pattern:** Backend follows a layered architecture:
- **Routes** → handle HTTP requests, validate input, call services
- **Services** → contain business logic, interact with database via TypeORM
- **Entities** → TypeORM models representing database tables
- **Middleware** → cross-cutting concerns (auth, error handling)

### Frontend Architecture

```
frontend/src/
├── components/       # React components organized by feature
│   ├── accounts/
│   ├── auth/
│   ├── navigation/
│   ├── transactionTable/
│   └── upload/
├── pages/            # Page-level components
├── context/          # React Context providers (Auth, Notifications)
├── assets/           # Static assets
├── App.tsx           # Root component with routing
├── main.tsx          # Application entry point
└── theme.ts          # MUI theme configuration

frontend/api/
├── apiClient.ts      # Base HTTP client with auth handling
└── services/         # API service modules (typed wrappers for endpoints)
```

### Shared Package

The `shared/` workspace contains TypeScript types used by both frontend and backend:
- Request/response types
- Entity types
- Shared constants

Import from `shared` in both workspaces to maintain type safety across the stack.

## Development Workflow

### Starting the Application

```bash
# Start all services (recommended)
docker-compose up

# Or run individually without Docker
npm run dev:backend    # Backend on https://localhost:86
npm run dev:frontend   # Frontend on https://localhost:3000
```

### Running Tests

```bash
# From project root
npm test                    # All tests in all workspaces
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only

# From specific workspace
cd backend && npm test
cd frontend && npm run test:unit
```

### Code Formatting

```bash
npm run format              # Format all files
npm run format:check        # Check formatting without changes
```

## Testing Practices

### Backend Testing

**Location:** Tests co-located with source files
- `*.test.unit.ts` → Unit tests (mocked dependencies)
- `*.test.integration.ts` → Integration tests (real Express app, mocked DB)

**Test Infrastructure:**
- `src/__tests__/fixtures/` → Shared test data (testUser, testAccount, etc.)
- `src/__tests__/mocks/` → Database mock factories (`createMockEntityManager`, `createMockQueryBuilder`)
- `src/__tests__/utils/testApp.ts` → Full Express app for integration tests

**Unit Test Pattern:**
```typescript
// Mock data-source before imports
vi.mock('../data-source', () => ({ getDB: vi.fn() }));
import { getDB } from '../data-source';

beforeEach(() => {
  mockDB = createMockEntityManager();
  vi.mocked(getDB).mockReturnValue(mockDB as any);
});
```

**Integration Test Pattern:**
```typescript
import request from 'supertest';
import { createTestApp } from '@test/utils/testApp';

const app = createTestApp();
const response = await request(app).get('/api/accounts');
```

### Frontend Testing

**Location:** Tests co-located with source files
- `*.test.unit.tsx` → Unit tests (mocked APIs and contexts)
- `*.test.integration.tsx` → Integration tests (MSW for API mocking)

**Test Infrastructure:**
- `src/__tests__/fixtures/` → Shared test data
- `src/__tests__/mocks/` → MSW server and request handlers

**Unit Test Pattern:**
```typescript
// Mock API before imports
vi.mock('../../../api', () => ({
  accountsApi: { getAccounts: vi.fn() }
}));
import { accountsApi } from '../../../api';

beforeEach(() => {
  vi.mocked(accountsApi.getAccounts).mockResolvedValue([testAccount]);
});
```

**Integration Test Pattern:**
```typescript
import { server } from '../../__tests__/mocks/server';

// Override default handler for specific test
server.use(
  http.get('/api/accounts', () => HttpResponse.json({ success: true, data: [] }))
);
```

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `AccountSelection.tsx` |
| Services | camelCase | `userService.ts` |
| Routes | camelCase | `accountRoutes.ts` |
| Entities | PascalCase | `User.ts`, `Transaction.ts` |
| Unit tests | `.test.unit.ts(x)` | `userService.test.unit.ts` |
| Integration tests | `.test.integration.ts(x)` | `accountRoutes.test.integration.ts` |

## Key Entities

### User
- Authentication and session management
- Has many Accounts
- Has many Categories

### Account
- Represents a bank account
- Belongs to User
- Has many Transactions

### Transaction
- Financial transaction record
- Belongs to Account
- Links to Category
- Stores raw source data and mapped fields

### Category
- User-defined transaction category
- Belongs to User

### UploadRecord
- Tracks CSV file uploads
- Stores column mappings and processing metadata

## API Patterns

### Standard Response Format

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string }
```

### Authentication

- Session-based authentication using cookies
- Backend middleware: `requireAuth` in `backend/src/middleware/auth.ts`
- Frontend context: `AuthContext` in `frontend/src/context/AuthContext.tsx`
- Protected routes check session validity

### Error Handling

- Backend: Centralized error handler middleware in `backend/src/middleware/errorHandler.ts`
- Frontend: Notification context for displaying errors to users

## Common Tasks

### Adding a New Entity

1. Create entity class in `backend/src/entities/`
2. Export from `backend/src/entities/index.ts`
3. Add to TypeORM DataSource in `backend/src/data-source.ts`
4. Create migration: `cd backend && npm run migration:generate`
5. Add corresponding type to `shared/src/types.ts`

### Adding a New API Endpoint

1. Create/update service in `backend/src/services/`
2. Create/update route handler in `backend/src/routes/`
3. Register route in `backend/src/routes/index.ts`
4. Add types to `shared/src/types.ts`
5. Create API service in `frontend/api/services/`
6. Write tests (unit + integration)

### Adding a New Component

1. Create component in appropriate `frontend/src/components/` subdirectory
2. Create co-located test file(s)
3. Import and use in parent component or page
4. Add to Material-UI theme if using new theme tokens

## Important Notes for Agents

- **All new features must have tests** (at minimum unit tests)
- Use existing test fixtures from `__tests__/fixtures/`
- Mock external dependencies in unit tests
- Prefer functional components and hooks in React
- Use async/await over promises
- Follow existing patterns in the codebase
- MSW handlers may need updating if new endpoints are added

## Documentation References

- [Backend Testing Guide](docs/testing-backend.md)
- [Frontend Testing Guide](docs/testing-frontend.md)
- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
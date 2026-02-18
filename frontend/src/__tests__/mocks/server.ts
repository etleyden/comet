import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server instance for intercepting network requests in tests.
 *
 * Usage in test files:
 *
 * ```ts
 * import { server } from '@test/mocks/server';
 *
 * beforeAll(() => server.listen());
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 * ```
 *
 * Override handlers for specific test scenarios:
 *
 * ```ts
 * import { http, HttpResponse } from 'msw';
 *
 * server.use(
 *   http.get('https://localhost:86/api/accounts', () => {
 *     return HttpResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
 *   })
 * );
 * ```
 */
export const server = setupServer(...handlers);

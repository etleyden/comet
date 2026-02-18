import { http, HttpResponse } from 'msw';
import { testUser, testAccount, testAccount2 } from '../fixtures/entities';
import type { ApiResponse, AuthUser, User, Account, LogoutResponse } from 'shared';

const BASE_URL = 'https://localhost:86';

/**
 * Default MSW request handlers that simulate successful API responses.
 * Tests can override individual handlers using `server.use(...)`.
 */
export const handlers = [
  // ─── Auth Handlers ──────────────────────────────────────────────────

  http.post(`${BASE_URL}/auth/register`, async () => {
    const response: ApiResponse<AuthUser> = {
      success: true,
      data: { ...testUser, token: 'mock-session-token' },
    };
    return HttpResponse.json(response);
  }),

  http.post(`${BASE_URL}/api/auth/login`, async () => {
    const response: ApiResponse<AuthUser> = {
      success: true,
      data: { ...testUser, token: 'mock-session-token' },
    };
    return HttpResponse.json(response);
  }),

  http.post(`${BASE_URL}/api/auth/logout`, () => {
    const response: ApiResponse<LogoutResponse> = {
      success: true,
      data: { success: true },
    };
    return HttpResponse.json(response);
  }),

  http.get(`${BASE_URL}/auth/me`, () => {
    const response: ApiResponse<User> = {
      success: true,
      data: testUser,
    };
    return HttpResponse.json(response);
  }),

  // ─── Account Handlers ──────────────────────────────────────────────

  http.get(`${BASE_URL}/api/accounts`, () => {
    const response: ApiResponse<Account[]> = {
      success: true,
      data: [testAccount, testAccount2],
    };
    return HttpResponse.json(response);
  }),

  http.post(`${BASE_URL}/api/accounts`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const response: ApiResponse<Account> = {
      success: true,
      data: {
        id: '770e8400-e29b-41d4-a716-446655440000',
        name: body.name as string,
        institution: body.institution as string | undefined,
        account: body.account as string,
        routing: body.routing as string,
      },
    };
    return HttpResponse.json(response);
  }),

  // ─── Health Handler ─────────────────────────────────────────────────

  http.get(`${BASE_URL}/health`, () => {
    return HttpResponse.json({ status: 'ok' });
  }),
];

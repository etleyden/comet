import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError } from '../../../api/errors';

// We test the ApiClient's error handling by mocking fetch and calling the client methods.
// The ApiClient is a singleton, so we import it after mocking fetch.

describe('ApiClient error handling', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  // Dynamic import to get a fresh ApiClient with mocked fetch
  async function getApiClient() {
    // Bust module cache to pick up mocked fetch
    const mod = await import('../../../api/apiClient');
    return mod.default;
  }

  it('throws ApiError with parsed message from JSON error response', async () => {
    const makeResponse = () =>
      new Response(JSON.stringify({ success: false, error: 'Vendor name already exists' }), {
        status: 409,
        statusText: 'Conflict',
        headers: { 'Content-Type': 'application/json' },
      });

    vi.mocked(fetch).mockResolvedValueOnce(makeResponse());

    const client = await getApiClient();

    try {
      await client.get('/api/vendors');
      expect.fail('Expected ApiError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Vendor name already exists');
      expect(apiErr.status).toBe(409);
    }
  });

  it('extracts individual Zod issue messages from validation error details', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Validation error',
          details: [{ path: ['name'], message: 'Required' }],
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const client = await getApiClient();
    try {
      await client.post('/api/vendors', {});
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      // Should surface the specific Zod message, not the generic label
      expect(apiErr.message).toBe('Required');
      // Raw details preserved for debugging
      expect(apiErr.details).toEqual([{ path: ['name'], message: 'Required' }]);
    }
  });

  it('joins multiple Zod issue messages with a semicolon', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Validation error',
          details: [
            { path: ['email'], message: 'Invalid email' },
            { path: ['name'], message: 'String must contain at least 2 character(s)' },
          ],
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const client = await getApiClient();
    try {
      await client.post('/api/auth/register', {});
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Invalid email; String must contain at least 2 character(s)');
    }
  });

  it('renders Zod message as-is regardless of path', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Validation error',
          details: [{ path: [], message: 'At least one field is required' }],
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const client = await getApiClient();
    try {
      await client.post('/api/something', {});
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('At least one field is required');
    }
  });

  it('falls back to error field when details is not a Zod array', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Something specific went wrong',
          details: { unexpected: true },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const client = await getApiClient();
    try {
      await client.post('/api/something', {});
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Something specific went wrong');
    }
  });

  it('falls back to status message for non-JSON error response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      })
    );

    const client = await getApiClient();
    try {
      await client.get('/api/something');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Something went wrong on our end');
      expect(apiErr.status).toBe(500);
    }
  });

  it('uses generic message for unknown status codes with non-JSON body', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('', { status: 418, headers: { 'Content-Type': 'text/plain' } })
    );

    const client = await getApiClient();
    try {
      await client.get('/api/teapot');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Request failed (418)');
      expect(apiErr.status).toBe(418);
    }
  });

  it('throws ApiError with network message on fetch failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    const client = await getApiClient();
    try {
      await client.get('/api/health');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('Unable to reach the server. Please check your connection.');
      expect(apiErr.status).toBe(0);
    }
  });

  it('returns parsed data on successful response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: '1', name: 'Test' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = await getApiClient();
    const result = await client.get('/api/vendors/1');
    expect(result).toEqual({ success: true, data: { id: '1', name: 'Test' } });
  });
});

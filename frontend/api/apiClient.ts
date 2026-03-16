import { ApiError } from './errors';

// API Routes constants
interface RequestOptions {
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
}

/** Default user-facing messages for common HTTP status codes. */
const STATUS_MESSAGES: Record<number, string> = {
  400: 'Invalid request',
  401: 'Please log in to continue',
  403: "You don't have permission to do that",
  404: 'The requested resource was not found',
  409: 'This conflicts with an existing resource',
  422: 'The submitted data is invalid',
  429: 'Too many requests — please try again later',
  500: 'Something went wrong on our end',
  502: 'Unable to reach the server',
  503: 'The service is temporarily unavailable',
};

/**
 * Extracts human-readable messages from a Zod `details` array.
 * Returns `null` if `details` is not a recognised Zod issues array.
 *
 * Zod issues look like: `[{ message: string, path: (string|number)[], code: string, ... }]`
 * Each issue's `message` is used as-is; multiple issues are joined with "; ".
 */
function extractZodDetails(details: unknown): string | null {
  if (!Array.isArray(details) || details.length === 0) return null;

  const messages = details.flatMap(issue => {
    if (typeof issue !== 'object' || issue === null) return [];
    const { message, path } = issue as { message?: unknown; path?: unknown };
    if (typeof message !== 'string' || !message.trim()) return [];

    if (Array.isArray(path) && path.length > 0) {
      return [`${message}`];
    }
    return [message];
  });

  return messages.length > 0 ? messages.join('; ') : null;
}

class ApiClientClass {
  private baseUrl = 'https://localhost:86';

  private async request<T>(
    route: string,
    method: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    // Build URL with query params if provided
    let url = `${this.baseUrl}${route}`;
    if (options?.params) {
      const params = new URLSearchParams(
        Object.entries(options.params).map(([k, v]) => [k, String(v)])
      );
      url += `?${params}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        credentials: 'include',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError('Unable to reach the server. Please check your connection.', 0);
    }

    if (!response.ok) {
      throw await this.buildApiError(response);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Parses a non-ok response into a typed ApiError with a user-friendly
   * message extracted from the backend's JSON body when possible.
   */
  private async buildApiError(response: Response): Promise<ApiError> {
    const status = response.status;
    let body: unknown;

    try {
      body = await response.json();
    } catch {
      // Response isn't JSON — fall back to status-based message
      return new ApiError(STATUS_MESSAGES[status] ?? `Request failed (${status})`, status);
    }

    // Backend returns { success: false, error: string, details?: unknown }
    if (typeof body === 'object' && body !== null && 'error' in body) {
      const { error, details } = body as { error: string; details?: unknown };

      // Zod validation errors arrive as `error: "Validation error"` with a
      // `details` array of ZodIssue objects, each carrying a specific `message`.
      // Flatten those into a single readable string instead of the generic label.
      if (details !== undefined) {
        const zodMessage = extractZodDetails(details);
        if (zodMessage) return new ApiError(zodMessage, status, details);
      }

      return new ApiError(error, status, details);
    }

    return new ApiError(STATUS_MESSAGES[status] ?? `Request failed (${status})`, status);
  }

  async get<T>(route: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(route, 'GET', undefined, options);
  }

  async post<T>(route: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(route, 'POST', body, options);
  }

  async put<T>(route: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(route, 'PUT', body, options);
  }

  async delete<T>(route: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(route, 'DELETE', undefined, options);
  }

  async patch<T>(route: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(route, 'PATCH', body, options);
  }
}

// Export singleton instance
const ApiClient = new ApiClientClass();
export default ApiClient;

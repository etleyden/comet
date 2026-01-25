// API Routes constants
interface RequestOptions {
    params?: Record<string, string | number>;
    headers?: Record<string, string>;
}

class ApiClientClass {
    private baseUrl = "https://localhost:86"; // Changed to HTTPS

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

        const response = await fetch(url, {
            method,
            credentials: 'include',
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error: ${response.status} - ${error}`);
        }

        return response.json() as Promise<T>;
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
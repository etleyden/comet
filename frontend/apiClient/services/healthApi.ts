import type { HealthStatus } from 'shared';
import ApiClient from '../apiClient';

/**
 * Health API service — typed wrapper for the health-check endpoint.
 */
export const healthApi = {
  /**
   * GET /health
   * Returns the current API health status.
   * Note: this endpoint does not use the ApiResponse wrapper.
   */
  check(): Promise<HealthStatus> {
    return ApiClient.get<HealthStatus>('/health');
  },
};

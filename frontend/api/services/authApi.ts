import type {
  ApiResponse,
  AuthUser,
  LoginRequest,
  LogoutResponse,
  RegisterRequest,
  ResetPasswordRequest,
  User,
} from 'shared';
import ApiClient from '../apiClient';

/**
 * Auth API service — typed wrappers for authentication endpoints.
 */
export const authApi = {
  /**
   * POST /api/auth/register
   * Creates a new user account and returns the authenticated user with a session token.
   */
  register(data: RegisterRequest): Promise<ApiResponse<AuthUser>> {
    return ApiClient.post<ApiResponse<AuthUser>>('/api/auth/register', data);
  },

  /**
   * POST /api/auth/login
   * Authenticates a user and returns the user with a session token.
   */
  login(data: LoginRequest): Promise<ApiResponse<AuthUser>> {
    return ApiClient.post<ApiResponse<AuthUser>>('/api/auth/login', data);
  },

  /**
   * POST /api/auth/logout
   * Ends the current session.
   */
  logout(): Promise<ApiResponse<LogoutResponse>> {
    return ApiClient.post<ApiResponse<LogoutResponse>>('/api/auth/logout');
  },

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user based on the session cookie.
   */
  getMe(): Promise<ApiResponse<User>> {
    return ApiClient.get<ApiResponse<User>>('/api/auth/me');
  },

  /**
   * PATCH /api/auth/password
   * Changes the current user's password. Used for forced resets and voluntary changes.
   */
  resetPassword(data: ResetPasswordRequest): Promise<ApiResponse<{ success: boolean }>> {
    return ApiClient.patch<ApiResponse<{ success: boolean }>>('/api/auth/password', data);
  },
};

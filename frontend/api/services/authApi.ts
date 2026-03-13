import type {
  ApiResponse,
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  LogoutResponse,
  RegisterRequest,
  ResetPasswordRequest,
  ResetPasswordWithTokenRequest,
  User,
  ValidateResetTokenRequest,
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

  /**
   * POST /api/auth/reset-password/request
   * Requests a password reset email to be sent to the user. The email contains a 
   * link to a frontend page where they can enter a new password along with the token 
   * from the email.
   */
  requestResetPassword(data: ForgotPasswordRequest): Promise<ApiResponse<{ success: boolean }>> {
    return ApiClient.post<ApiResponse<{ success: boolean }>>('/api/auth/reset-password/request', data);
  },

  /**
   * POST /api/auth/reset-password/validate
   * Checks whether a reset token is still valid (not expired, not used).
   */
  validateResetToken(data: ValidateResetTokenRequest): Promise<ApiResponse<{ valid: boolean }>> {
    return ApiClient.post<ApiResponse<{ valid: boolean }>>('/api/auth/reset-password/validate', data);
  },

  /**
   * POST /api/auth/reset-password/confirm
   * Resets the user's password using a one-time token. Returns the authenticated user with a session.
   */
  confirmResetPassword(data: ResetPasswordWithTokenRequest): Promise<ApiResponse<AuthUser>> {
    return ApiClient.post<ApiResponse<AuthUser>>('/api/auth/reset-password/confirm', data);
  },

};

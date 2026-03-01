import { Express, Response } from 'express';
import { z } from 'zod';
import { createEndpoint } from '../utils/createEndpoint';
import { UserService } from '../services/userService';
import { requireAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/api';
import type { AuthUser, User as ApiUser, LogoutResponse, ResetPasswordRequest } from 'shared';
import { validatePassword } from 'shared';
import UserEntity from '../entities/User';

/** Zod refinement that delegates to the shared validatePassword rules. */
const passwordField = () =>
  z.string().superRefine((val, ctx) => {
    const { valid, errors } = validatePassword(val);
    if (!valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Password does not meet requirements: ${errors.join(', ')}`,
      });
    }
  });

const CreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: passwordField(),
});

const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

function setSessionCookie(res: Response, token: string): void {
  res.cookie('session', token, SESSION_COOKIE_OPTIONS);
}

function clearSessionCookie(res: Response): void {
  const { maxAge, ...options } = SESSION_COOKIE_OPTIONS;
  res.clearCookie('session', options);
}

function toAuthUser(user: UserEntity, token: string): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    requiresPasswordReset: user.requiresPasswordReset,
    token,
  };
}

export function userRoutes(app: Express) {
  const userService = new UserService();

  // POST /auth/register - Create user
  app.post(
    '/auth/register',
    createEndpoint({
      schema: CreateUserSchema,
      handler: async (input, req, res): Promise<AuthUser> => {
        const user = await userService.createUser(input.name, input.email, input.password);
        const session = await userService.createSession(user);
        setSessionCookie(res, session.token);
        return toAuthUser(user, session.token);
      },
    })
  );

  // POST /api/auth/login - Login user
  app.post(
    '/api/auth/login',
    createEndpoint({
      schema: UserLoginSchema,
      handler: async (input, req, res): Promise<AuthUser> => {
        const user = await userService.authenticateUser(input.email, input.password);
        const session = await userService.createSession(user);
        setSessionCookie(res, session.token);
        return toAuthUser(user, session.token);
      },
    })
  );

  // POST /api/auth/logout - Logout user
  app.post(
    '/api/auth/logout',
    createEndpoint({
      handler: async (input, req, res): Promise<LogoutResponse> => {
        const sessionToken = req.cookies?.session;
        if (sessionToken) {
          await userService.invalidateSessionByToken(sessionToken);
        }
        clearSessionCookie(res);
        return { success: true };
      },
    })
  );

  // GET /auth/me - Get current user
  app.get(
    '/auth/me',
    requireAuth(),
    createEndpoint<unknown, ApiUser, AuthenticatedRequest>({
      handler: async (input, req) => {
        return {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          requiresPasswordReset: req.user.requiresPasswordReset,
        };
      },
    })
  );

  // POST /api/auth/reset-password - Change password (requires authentication)
  const ResetPasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField(),
  });

  app.post(
    '/api/auth/reset-password',
    requireAuth(),
    createEndpoint<z.infer<typeof ResetPasswordSchema>, { success: boolean }, AuthenticatedRequest>({
      schema: ResetPasswordSchema,
      handler: async (input, req) => {
        await userService.resetPassword(req.user.id, input.currentPassword, input.newPassword);
        return { success: true };
      },
    })
  );
}
/**
 * TODO: Consider CSRF protection for state-changing operations.
 * Referenced from: https://lucia-auth.com/sessions/basic
 */

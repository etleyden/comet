import { Request, Response, NextFunction } from 'express';
import { Role } from 'shared';
import { UserService } from '../services/userService';
import User from '../entities/User';

// Extend Express Request to allow middleware to attach auth properties.
// Route handlers should use AuthenticatedRequest (from types/api.ts) for
// non-optional access to user/authSession behind requireAuth().
declare global {
  namespace Express {
    interface Request {
      user?: User;
      authSession?: { id: string; userId: string };
    }
  }
}

export interface AuthOptions {
  required?: boolean;
  role?: Role;
}

/** Role hierarchy: higher index ⇒ more privileged. */
const ROLE_HIERARCHY: Role[] = [Role.USER, Role.ADMIN];

function meetsRoleRequirement(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}

/**
 * Authentication middleware that validates session tokens, attaches the user to
 * the request, and optionally enforces a minimum role.
 *
 * @param optionsOrRole - A {@link Role} string **or** an {@link AuthOptions} object.
 *
 * @example
 * // Require authentication (any role, defaults to USER)
 * app.get('/api/protected', requireAuth(), handler);
 *
 * // Shorthand — require ADMIN role
 * app.get('/api/admin', requireAuth(Role.ADMIN), handler);
 *
 * // Explicit options object
 * app.get('/api/admin', requireAuth({ role: Role.ADMIN }), handler);
 *
 * // Optional authentication (user attached if logged in, but route is accessible without auth)
 * app.get('/api/public', requireAuth({ required: false }), handler);
 */
export function requireAuth(optionsOrRole?: AuthOptions | Role) {
  const options: AuthOptions =
    typeof optionsOrRole === 'string' ? { role: optionsOrRole } : optionsOrRole ?? {};
  const { required = true, role: requiredRole = Role.USER } = options;
  const userService = new UserService();

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try to get session token from cookie or Authorization header
      const cookieToken = req.cookies?.session;
      const headerToken = req.headers.authorization?.replace('Bearer ', '');
      const token = cookieToken || headerToken;

      if (!token) {
        if (required) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required',
          });
        }
        return next();
      }

      // Validate session token
      const session = await userService.validateSessionToken(token);

      if (!session || !session.user) {
        if (required) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired session',
          });
        }
        return next();
      }

      // Attach user and session to request
      req.user = session.user;
      req.authSession = {
        id: session.id,
        userId: session.user.id,
      };

      // Role-based access control
      if (!meetsRoleRequirement(req.user.role, requiredRole)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      next();
    } catch (error) {
      if (required) {
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
        });
      }
      next();
    }
  };
}

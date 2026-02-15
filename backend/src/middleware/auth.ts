import { Request, Response, NextFunction } from 'express';
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
  roles?: string[]; // For future role-based access control
}

/**
 * Authentication middleware that validates session tokens and attaches user to request.
 *
 * @param options - Configuration options
 * @param options.required - If true, throws error when no valid session found (default: true)
 * @param options.roles - Array of allowed roles (for future RBAC implementation)
 *
 * @example
 * // Require authentication
 * app.get('/api/protected', requireAuth(), handler);
 *
 * // Optional authentication (user attached if logged in, but route is accessible without auth)
 * app.get('/api/public', requireAuth({ required: false }), handler);
 *
 * // Future: Role-based access control
 * // app.get('/api/admin', requireAuth({ roles: ['admin'] }), handler);
 */
export function requireAuth(options: AuthOptions = {}) {
  const { required = true, roles = [] } = options;
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

      // TODO: Future role-based access control
      // if (roles.length > 0) {
      //   const userRoles = req.user.roles || [];
      //   const hasRequiredRole = roles.some(role => userRoles.includes(role));
      //   if (!hasRequiredRole) {
      //     return res.status(403).json({
      //       success: false,
      //       error: 'Insufficient permissions'
      //     });
      //   }
      // }

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

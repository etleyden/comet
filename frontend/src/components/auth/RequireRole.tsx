import type { Role } from 'shared';
import { useAuth } from '../../context/AuthContext';

interface RequireRoleProps {
  /** Minimum role required to render children. */
  role: Role;
  /** Content shown when the user lacks the required role (defaults to nothing). */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Conditionally renders children only when the current user meets the required
 * role. Useful for hiding UI elements (nav links, buttons, sections) based on
 * the user's role.
 *
 * @example
 * <RequireRole role={Role.ADMIN}>
 *   <AdminPanel />
 * </RequireRole>
 */
export function RequireRole({ role, fallback = null, children }: RequireRoleProps) {
  const { hasRole } = useAuth();

  if (!hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

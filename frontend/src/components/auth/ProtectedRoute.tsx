import { Navigate } from 'react-router-dom';
import type { Role } from 'shared';
import { useAuth } from '../../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  isPublic?: boolean;
  /** Minimum role required to access this route. Only evaluated for non-public routes. */
  requiredRole?: Role;
}

/**
 * ProtectedRoute component that handles authentication and role-based routing.
 *
 * By default, routes are protected and require authentication (any role).
 * Set isPublic={true} to allow unauthenticated access.
 * Set requiredRole to restrict a route to users with a minimum role level.
 *
 * @example
 * // Protected route (default behavior — any authenticated user)
 * <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
 *
 * // Admin-only route
 * <Route path="/admin" element={<ProtectedRoute requiredRole={Role.ADMIN}><AdminPage /></ProtectedRoute>} />
 *
 * // Public route
 * <Route path="/about" element={<ProtectedRoute isPublic><AboutPage /></ProtectedRoute>} />
 */
export function ProtectedRoute({ children, isPublic = false, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If route requires auth and user is not authenticated, redirect to /
  if (!isPublic && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If user is authenticated but lacks the required role, redirect to /home
  if (!isPublic && requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/home" replace />;
  }

  // If user is authenticated and tries to access login page, redirect to /home
  if (isPublic && isAuthenticated && window.location.pathname === '/login') {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

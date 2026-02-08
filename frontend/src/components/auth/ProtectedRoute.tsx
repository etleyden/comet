import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
  isPublic?: boolean;
}

/**
 * ProtectedRoute component that handles authentication-based routing.
 *
 * By default, routes are protected and require authentication.
 * Set isPublic={true} to allow unauthenticated access.
 *
 * @example
 * // Protected route (default behavior)
 * <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
 *
 * // Public route
 * <Route path="/about" element={<ProtectedRoute isPublic><AboutPage /></ProtectedRoute>} />
 */
export function ProtectedRoute({ children, isPublic = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

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

  // If user is authenticated and tries to access login page, redirect to /home
  if (isPublic && isAuthenticated && window.location.pathname === '/login') {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

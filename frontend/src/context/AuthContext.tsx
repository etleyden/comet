import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from 'shared';
import { Role, meetsRoleRequirement } from 'shared';
import { authApi } from '../../api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True when the user must change their password before using the app. */
  requiresPasswordReset: boolean;
  /** Returns true when the current user's role meets or exceeds the required role. */
  hasRole: (role: Role) => boolean;
  /** Re-fetches the current user from the server (e.g. after a password reset). */
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authApi.getMe();
      if (response.success) {
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      if (response.success) {
        setUser(response.data);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await authApi.register({ name, email, password });
      if (response.success) {
        setUser(response.data);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const hasRole = useCallback(
    (role: Role): boolean => {
      if (!user) return false;
      return meetsRoleRequirement(user.role, role);
    },
    [user],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      requiresPasswordReset: !!user?.requiresPasswordReset,
      hasRole,
      refreshUser: checkAuth,
      login,
      register,
      logout,
    }),
    [user, isLoading, hasRole],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { authApi } from '../services/api';
import { useSocket } from './SocketContext';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;  // Has valid admin credentials
  isAdmin: boolean;          // Acting as admin (authenticated + on admin route)
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Check if current path is an admin route
function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') || 
         pathname === '/queue' || 
         pathname === '/login';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setAdminAuth } = useSocket();
  const location = useLocation();

  // Check auth status on mount
  useEffect(() => {
    authApi.getMe()
      .then((state) => {
        if (state.authenticated && state.user) {
          setUser(state.user);
          setAdminAuth(state.user);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [setAdminAuth]);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    if (result.success) {
      const authUser: AuthUser = {
        id: 0, // Server doesn't return ID in login response
        username: result.user.username,
        isAdmin: result.user.isAdmin,
      };
      setUser(authUser);
      setAdminAuth(authUser);
    }
  }, [setAdminAuth]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  // isAuthenticated: user has valid admin credentials (cookie-based)
  const isAuthenticated = user?.isAdmin ?? false;
  
  // isAdmin: only true when authenticated AND on an admin route
  // This allows the same browser to act as viewer on "/" and admin on "/admin"
  const isAdmin = isAuthenticated && isAdminRoute(location.pathname);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isAdmin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


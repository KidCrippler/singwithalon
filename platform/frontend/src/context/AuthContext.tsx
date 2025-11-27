import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';
import { useSocket } from './SocketContext';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setAdminAuth } = useSocket();

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

  const isAdmin = user?.isAdmin ?? false;

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, login, logout }}>
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


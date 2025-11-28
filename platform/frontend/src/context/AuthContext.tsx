import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { authApi } from '../services/api';
import { useSocket } from './SocketContext';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;  // Has valid admin credentials
  isAdmin: boolean;          // Acting as admin (authenticated + in admin mode)
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Session storage key for admin mode
const ADMIN_MODE_KEY = 'singalong_admin_mode';

// Check what mode a route sets (or null if it doesn't change mode)
function getRouteMode(pathname: string): boolean | null {
  // Viewer entry point - explicitly sets viewer mode
  if (pathname === '/') {
    return false;
  }
  // Admin entry points - explicitly sets admin mode
  if (pathname.startsWith('/admin') || pathname === '/queue' || pathname === '/login') {
    return true;
  }
  // Shared routes (e.g., /playing-now, /song/:id) - preserve current mode
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setAdminAuth } = useSocket();
  const location = useLocation();
  
  // Admin mode state - persisted in sessionStorage
  // Initialize from sessionStorage or from current route
  const [adminMode, setAdminMode] = useState<boolean>(() => {
    const stored = sessionStorage.getItem(ADMIN_MODE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
    // If no stored value, infer from initial route
    const routeMode = getRouteMode(window.location.pathname);
    return routeMode ?? false;
  });
  
  // Track if this is the initial mount to avoid double-setting mode
  const isInitialMount = useRef(true);

  // Update admin mode when route changes
  useEffect(() => {
    // Skip the initial mount since we already set mode from initial route
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const routeMode = getRouteMode(location.pathname);
    if (routeMode !== null) {
      // Route explicitly sets a mode
      setAdminMode(routeMode);
      sessionStorage.setItem(ADMIN_MODE_KEY, String(routeMode));
    }
    // If routeMode is null, we preserve the current mode (shared routes)
  }, [location.pathname]);

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
      // Set admin mode on successful login
      setAdminMode(true);
      sessionStorage.setItem(ADMIN_MODE_KEY, 'true');
    }
  }, [setAdminAuth]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    // Clear admin mode on logout
    setAdminMode(false);
    sessionStorage.removeItem(ADMIN_MODE_KEY);
  }, []);

  // isAuthenticated: user has valid admin credentials (cookie-based)
  const isAuthenticated = user?.isAdmin ?? false;
  
  // isAdmin: true when authenticated AND in admin mode
  // Admin mode is set by navigating to /admin, /queue, /login
  // Admin mode is cleared by navigating to / or logging out
  // Admin mode is preserved when navigating to shared routes like /playing-now
  const isAdmin = isAuthenticated && adminMode;

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


import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { authApi } from '../services/api';
import { useSocket } from './SocketContext';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;  // Has valid admin credentials
  isAdmin: boolean;          // Acting as admin (authenticated + in admin mode)
  isRoomOwner: boolean;      // Is admin AND owns the current room
  isLoading: boolean;
  login: (roomUsername: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkRoomOwnership: (roomUsername: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Session storage key for admin mode
const ADMIN_MODE_KEY = 'singalong_admin_mode';

// Check what mode a route sets (or null if it doesn't change mode)
function getRouteMode(pathname: string): boolean | null {
  // Admin entry points - explicitly sets admin mode
  if (pathname.endsWith('/admin') || pathname.endsWith('/queue')) {
    return true;
  }
  
  // Viewer entry point - explicitly sets viewer mode
  // Match /:username (exactly, with optional trailing slash)
  // This is the room's index route where viewers enter
  if (/^\/[^\/]+\/?$/.test(pathname)) {
    return false;
  }
  
  // Shared routes (playing-now, song/:id) - preserve current mode
  return null;
}

// Extract room username from path
function getRoomFromPath(pathname: string): string | null {
  // Match /:username or /:username/...
  const match = pathname.match(/^\/([^\/]+)/);
  return match ? match[1] : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setAdminAuth } = useSocket();
  const location = useLocation();
  
  // Admin mode state - persisted in sessionStorage
  const [adminMode, setAdminMode] = useState<boolean>(() => {
    const stored = sessionStorage.getItem(ADMIN_MODE_KEY);
    if (stored !== null) {
      return stored === 'true';
    }
    // If no stored value, infer from initial route
    const routeMode = getRouteMode(window.location.pathname);
    return routeMode ?? false;
  });
  
  // Current room from URL (for checking room ownership)
  const [currentRoom, setCurrentRoom] = useState<string | null>(() => {
    return getRoomFromPath(window.location.pathname);
  });
  
  // Track if this is the initial mount to avoid double-setting mode
  const isInitialMount = useRef(true);

  // Update admin mode and current room when route changes
  useEffect(() => {
    // Update current room
    const newRoom = getRoomFromPath(location.pathname);
    setCurrentRoom(newRoom);
    
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

  // Room-scoped login
  const login = useCallback(async (roomUsername: string, password: string) => {
    const result = await authApi.login(roomUsername, password);
    if (result.success) {
      const authUser: AuthUser = {
        id: result.user.id,
        username: result.user.username,
        displayName: result.user.displayName,
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
    setAdminAuth(null);
    // Clear admin mode on logout
    setAdminMode(false);
    sessionStorage.removeItem(ADMIN_MODE_KEY);
  }, [setAdminAuth]);

  // Check if user owns a specific room
  const checkRoomOwnership = useCallback((roomUsername: string): boolean => {
    if (!user?.isAdmin) return false;
    return user.username === roomUsername;
  }, [user]);

  // isAuthenticated: user has valid admin credentials (cookie-based)
  const isAuthenticated = user?.isAdmin ?? false;
  
  // isAdmin: true when authenticated AND in admin mode
  const isAdmin = isAuthenticated && adminMode;
  
  // isRoomOwner: true when authenticated, in admin mode, AND username matches current room
  // This controls whether admin UI is shown - requires being in admin mode
  const isRoomOwner = useMemo(() => {
    if (!isAuthenticated || !adminMode || !currentRoom) return false;
    return user?.username === currentRoom;
  }, [isAuthenticated, adminMode, currentRoom, user?.username]);

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    isAdmin,
    isRoomOwner,
    isLoading,
    login,
    logout,
    checkRoomOwnership,
  }), [user, isAuthenticated, isAdmin, isRoomOwner, isLoading, login, logout, checkRoomOwnership]);

  return (
    <AuthContext.Provider value={value}>
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

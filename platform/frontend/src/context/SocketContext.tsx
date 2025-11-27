import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AuthUser } from '../types';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  setAdminAuth: (user: AuthUser) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Get or create session ID
    let sessionId = localStorage.getItem('singalong_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('singalong_session_id', sessionId);
    }

    const socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      auth: {
        sessionId,
      },
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('pong', () => {
      // Heartbeat acknowledged
    });

    setSocket(socketInstance);

    // Set up heartbeat interval (every 60 seconds)
    pingIntervalRef.current = setInterval(() => {
      if (socketInstance.connected) {
        socketInstance.emit('ping');
      }
    }, 60000);

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      socketInstance.disconnect();
    };
  }, []);

  const setAdminAuth = useCallback((user: AuthUser) => {
    if (socket) {
      socket.emit('auth:admin', user);
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, setAdminAuth }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}


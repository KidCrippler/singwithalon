import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AuthUser } from '../types';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  isRoomJoined: boolean;
  roomSessionId: string | null;
  joinRoom: (roomUsername: string, sessionId: string, isProjector?: boolean) => void;
  setAdminAuth: (user: AuthUser | null) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRoomJoined, setIsRoomJoined] = useState(false);
  const [roomSessionId, setRoomSessionId] = useState<string | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Store state for reconnection
  const adminUserRef = useRef<AuthUser | null>(null);
  const currentRoomRef = useRef<{ username: string; sessionId: string; isProjector?: boolean } | null>(null);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      // Don't auto-connect with session, we'll join rooms explicitly
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      
      // Rejoin room on reconnect if we were in one
      if (currentRoomRef.current) {
        const { username, sessionId, isProjector } = currentRoomRef.current;
        socketInstance.emit('join:room', { roomUsername: username, sessionId, isProjector });
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      setIsRoomJoined(false);
    });

    socketInstance.on('room:joined', (data: { roomUsername: string; sessionId: string; adminId: number }) => {
      console.log('Joined room:', data.roomUsername);
      setIsRoomJoined(true);
      setRoomSessionId(data.sessionId);
      
      // Re-emit admin auth if we have one
      if (adminUserRef.current) {
        socketInstance.emit('auth:admin', adminUserRef.current);
      }
    });

    socketInstance.on('error', (data: { message: string }) => {
      console.error('Socket error:', data.message);
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

  const joinRoom = useCallback((roomUsername: string, sessionId: string, isProjector?: boolean) => {
    if (!socket?.connected) {
      console.warn('Cannot join room: socket not connected');
      return;
    }

    // Store for reconnection
    currentRoomRef.current = { username: roomUsername, sessionId, isProjector };
    
    socket.emit('join:room', { roomUsername, sessionId, isProjector });
  }, [socket]);

  const setAdminAuth = useCallback((user: AuthUser | null) => {
    adminUserRef.current = user;
    if (socket?.connected && user && isRoomJoined) {
      socket.emit('auth:admin', user);
    }
  }, [socket, isRoomJoined]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, isRoomJoined, roomSessionId, joinRoom, setAdminAuth }}>
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

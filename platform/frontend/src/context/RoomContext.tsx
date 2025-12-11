import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { stateApi } from '../services/api';
import type { Room } from '../types';

interface RoomContextValue {
  room: Room | null;
  roomUsername: string | null;
  isRoomLoading: boolean;
  roomError: string | null;
  sessionId: string | null;  // Per-room session ID
  getSessionId: () => string;  // Get or create session ID for current room
}

const RoomContext = createContext<RoomContextValue | null>(null);

// Session storage key prefix for per-room sessions
const SESSION_KEY_PREFIX = 'singalong:session:';

export function RoomProvider({ children }: { children: React.ReactNode }) {
  // This component MUST be inside a Route with :username param
  const { username } = useParams<{ username: string }>();
  
  const [room, setRoom] = useState<Room | null>(null);
  // Start as true - we're always loading initially when we have a username
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Get or create session ID for the current room
  const getSessionId = useCallback((): string => {
    if (!username) return '';
    
    const key = `${SESSION_KEY_PREFIX}${username}`;
    let storedSessionId = localStorage.getItem(key);
    
    if (!storedSessionId) {
      storedSessionId = crypto.randomUUID();
      localStorage.setItem(key, storedSessionId);
    }
    
    return storedSessionId;
  }, [username]);

  // Load room info when username changes
  useEffect(() => {
    // username should always be defined since we're inside a :username route
    if (!username) {
      setRoom(null);
      setIsRoomLoading(false);
      setRoomError('No room specified');
      setSessionId(null);
      return;
    }

    setIsRoomLoading(true);
    setRoomError(null);

    // Fetch room state (which validates the room exists)
    stateApi.get(username)
      .then((state) => {
        setRoom({
          username: state.roomUsername,
          displayName: state.roomDisplayName,
          adminId: state.roomAdminId,
        });
        setSessionId(getSessionId());
        setRoomError(null);
      })
      .catch((err) => {
        console.error('Failed to load room:', err);
        setRoom(null);
        setRoomError(err.message || 'Room not found');
      })
      .finally(() => {
        setIsRoomLoading(false);
      });
  }, [username, getSessionId]);

  const value = useMemo(() => ({
    room,
    roomUsername: username || null,
    isRoomLoading,
    roomError,
    sessionId,
    getSessionId,
  }), [room, username, isRoomLoading, roomError, sessionId, getSessionId]);

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}

// Hook to get just the username for API calls
export function useRoomUsername(): string {
  const { roomUsername } = useRoom();
  if (!roomUsername) {
    throw new Error('No room context available');
  }
  return roomUsername;
}


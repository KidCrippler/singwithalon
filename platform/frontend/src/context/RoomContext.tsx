import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { stateApi } from '../services/api';
import { getRoomSessionId } from '../utils/session';
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

// Turn a raw room-load failure into a short troubleshooting hint. The heading on
// screen still says "room not found", but the actual cause is often a DB or
// server problem — this points at where to look first.
function describeRoomError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const detail = raw.slice(0, 200);

  // fetch() itself rejected — never reached the server (server down, DNS, CORS).
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return `לא ניתן להתחבר לשרת. ייתכן שהשרת מושבת או בעיית רשת/CORS — בדקו את לוגים ב‑Railway ואת זמינות השרת. [${detail}]`;
  }
  // resolveRoom returned 503 — server is up but the DB ping failed.
  if (/database unavailable|HTTP 503/i.test(raw)) {
    return `השרת פעיל אך מסד הנתונים אינו זמין. בדקו את חיבור ה‑Turso ואת לוגי השרת (חפשו "DB heartbeat failed" או "resolveRoom DB failure"). [${detail}]`;
  }
  // Genuine 404 from resolveRoom — the room really isn\'t there.
  if (/room not found/i.test(raw)) {
    return `החדר לא קיים או אינו פעיל. בדקו את שם המשתמש בכתובת ואת הגדרת ADMIN_USERS. [${detail}]`;
  }
  // Anything else (HTTP 500 etc.).
  return `שגיאת שרת לא צפויה. בדקו את לוגי השרת. [${detail}]`;
}

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
    return getRoomSessionId(username);
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
        setRoomError(describeRoomError(err));
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


import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useRoom } from './RoomContext';
import { queueApi } from '../services/api';
import type { GroupedQueue, QueueEntry } from '../types';

interface QueueContextValue {
  queueCount: number;
  myPicks: QueueEntry[];
  myPicksCount: number;
  refreshMyPicks: () => void;
}

const QueueContext = createContext<QueueContextValue | null>(null);

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [queueCount, setQueueCount] = useState(0);
  const [myPicks, setMyPicks] = useState<QueueEntry[]>([]);
  const { isRoomOwner } = useAuth();
  const { socket, isRoomJoined } = useSocket();
  const { roomUsername } = useRoom();

  const myPicksCount = myPicks.filter(e => e.status === 'pending').length;

  // Helper to count total entries across all groups
  const countEntries = useCallback((groups: GroupedQueue[]): number => {
    return groups.reduce((total, group) => {
      const pendingCount = group.entries.filter(e => e.status === 'pending').length;
      return total + pendingCount;
    }, 0);
  }, []);

  const refreshMyPicks = useCallback(() => {
    if (!roomUsername) return;
    queueApi.getMine(roomUsername)
      .then(setMyPicks)
      .catch(err => console.error('Failed to fetch my picks:', err));
  }, [roomUsername]);

  // Fetch initial queue count (room owner only)
  useEffect(() => {
    if (!isRoomOwner || !roomUsername) {
      setQueueCount(0);
      return;
    }

    queueApi.list(roomUsername)
      .then(groups => setQueueCount(countEntries(groups)))
      .catch(err => console.error('Failed to fetch queue count:', err));
  }, [isRoomOwner, roomUsername, countEntries]);

  // Listen for queue updates via socket (admin)
  useEffect(() => {
    if (!socket || !isRoomOwner || !isRoomJoined) return;

    const handleQueueUpdate = (payload: { queue: GroupedQueue[] }) => {
      setQueueCount(countEntries(payload.queue));
    };

    socket.on('queue:updated', handleQueueUpdate);

    return () => {
      socket.off('queue:updated', handleQueueUpdate);
    };
  }, [socket, isRoomOwner, isRoomJoined, countEntries]);

  // Fetch viewer's own picks on mount and on status changes
  useEffect(() => {
    if (isRoomOwner || !roomUsername || !isRoomJoined) {
      setMyPicks([]);
      return;
    }

    refreshMyPicks();
  }, [isRoomOwner, roomUsername, isRoomJoined, refreshMyPicks]);

  useEffect(() => {
    if (!socket || isRoomOwner || !isRoomJoined) return;

    const handleStatusChanged = () => {
      refreshMyPicks();
    };

    socket.on('songs:status-changed', handleStatusChanged);

    return () => {
      socket.off('songs:status-changed', handleStatusChanged);
    };
  }, [socket, isRoomOwner, isRoomJoined, refreshMyPicks]);

  return (
    <QueueContext.Provider value={{ queueCount, myPicks, myPicksCount, refreshMyPicks }}>
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
}

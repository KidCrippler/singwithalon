import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useRoom } from './RoomContext';
import { queueApi } from '../services/api';
import type { GroupedQueue } from '../types';

interface QueueContextValue {
  queueCount: number;
}

const QueueContext = createContext<QueueContextValue | null>(null);

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [queueCount, setQueueCount] = useState(0);
  const { isRoomOwner } = useAuth();
  const { socket, isRoomJoined } = useSocket();
  const { roomUsername } = useRoom();

  // Helper to count total entries across all groups
  const countEntries = useCallback((groups: GroupedQueue[]): number => {
    return groups.reduce((total, group) => {
      // Only count pending entries (not played)
      const pendingCount = group.entries.filter(e => e.status === 'pending').length;
      return total + pendingCount;
    }, 0);
  }, []);

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

  // Listen for queue updates via socket
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

  return (
    <QueueContext.Provider value={{ queueCount }}>
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

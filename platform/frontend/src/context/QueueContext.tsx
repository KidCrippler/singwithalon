import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { queueApi } from '../services/api';
import type { GroupedQueue } from '../types';

interface QueueContextValue {
  queueCount: number;
}

const QueueContext = createContext<QueueContextValue | null>(null);

export function QueueProvider({ children }: { children: React.ReactNode }) {
  const [queueCount, setQueueCount] = useState(0);
  const { isAdmin } = useAuth();
  const { socket } = useSocket();

  // Helper to count total entries across all groups
  const countEntries = useCallback((groups: GroupedQueue[]): number => {
    return groups.reduce((total, group) => {
      // Only count pending entries (not played)
      const pendingCount = group.entries.filter(e => e.status === 'pending').length;
      return total + pendingCount;
    }, 0);
  }, []);

  // Fetch initial queue count (admin only)
  useEffect(() => {
    if (!isAdmin) {
      setQueueCount(0);
      return;
    }

    queueApi.list()
      .then(groups => setQueueCount(countEntries(groups)))
      .catch(err => console.error('Failed to fetch queue count:', err));
  }, [isAdmin, countEntries]);

  // Listen for queue updates via socket
  useEffect(() => {
    if (!socket || !isAdmin) return;

    const handleQueueUpdate = (payload: { queue: GroupedQueue[] }) => {
      setQueueCount(countEntries(payload.queue));
    };

    socket.on('queue:updated', handleQueueUpdate);

    return () => {
      socket.off('queue:updated', handleQueueUpdate);
    };
  }, [socket, isAdmin, countEntries]);

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


import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { queueApi } from '../../services/api';
import type { GroupedQueue } from '../../types';

export function QueueView() {
  const [queue, setQueue] = useState<GroupedQueue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAdmin } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, navigate]);

  // Fetch initial queue
  useEffect(() => {
    if (!isAdmin) return;
    
    queueApi.list()
      .then(setQueue)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isAdmin]);

  // Listen for queue updates
  useEffect(() => {
    if (!socket) return;

    socket.on('queue:updated', (payload: { queue: GroupedQueue[] }) => {
      setQueue(payload.queue);
    });

    return () => {
      socket.off('queue:updated');
    };
  }, [socket]);

  const handlePresent = (queueId: number) => {
    socket?.emit('queue:present', { queueId });
    navigate('/playing-now');
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>טוען תור...</p>
      </div>
    );
  }

  return (
    <div className="queue-view">
      <h1>📋 תור הבקשות</h1>
      
      {queue.length === 0 ? (
        <div className="empty-queue">
          <p>אין בקשות בתור</p>
        </div>
      ) : (
        <div className="queue-groups">
          {queue.map((group, groupIndex) => (
            <div key={`${group.sessionId}-${groupIndex}`} className="queue-group">
              <div className="group-header">
                <span className="requester-name">{group.requesterName}</span>
                <span className="request-count">{group.entries.length} שירים</span>
              </div>
              <div className="group-entries">
                {group.entries.map(entry => (
                  <div 
                    key={entry.id} 
                    className={`queue-entry ${entry.status}`}
                  >
                    <div className="entry-info">
                      <span className="song-name">{entry.songName}</span>
                      <span className="song-artist">{entry.songArtist}</span>
                    </div>
                    {entry.status === 'pending' && (
                      <button 
                        onClick={() => handlePresent(entry.id)}
                        className="present-btn"
                      >
                        ▶ הצג
                      </button>
                    )}
                    {entry.status === 'played' && (
                      <span className="played-badge">✓ הושר</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


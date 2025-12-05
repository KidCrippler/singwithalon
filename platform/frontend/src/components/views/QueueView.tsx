import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useSearch } from '../../context/SearchContext';
import { useRoom } from '../../context/RoomContext';
import { queueApi } from '../../services/api';
import type { GroupedQueue } from '../../types';

export function QueueView() {
  const [queue, setQueue] = useState<GroupedQueue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isRoomOwner } = useAuth();
  const { socket, isRoomJoined } = useSocket();
  const { setSearchTerm } = useSearch();
  const { roomUsername, roomError, isRoomLoading } = useRoom();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  // Redirect non-owners
  useEffect(() => {
    if (!isRoomLoading && !isRoomOwner && username) {
      navigate(`/${username}/admin`);
    }
  }, [isRoomOwner, isRoomLoading, username, navigate]);

  // Fetch initial queue
  useEffect(() => {
    if (!isRoomOwner || !roomUsername) return;
    
    queueApi.list(roomUsername)
      .then(setQueue)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isRoomOwner, roomUsername]);

  // Listen for queue updates
  useEffect(() => {
    if (!socket || !isRoomJoined) return;

    const handleQueueUpdate = (payload: { queue: GroupedQueue[] }) => {
      setQueue(payload.queue);
    };

    socket.on('queue:updated', handleQueueUpdate);

    return () => {
      socket.off('queue:updated', handleQueueUpdate);
    };
  }, [socket, isRoomJoined]);

  const handlePresent = async (queueId: number) => {
    if (!roomUsername) return;
    try {
      await queueApi.present(roomUsername, queueId);
      setSearchTerm(''); // Clear search filter when presenting
      navigate(`/${username}/playing-now`);
    } catch (error) {
      console.error('Failed to present song:', error);
    }
  };

  const handleDeleteEntry = async (queueId: number) => {
    if (!roomUsername) return;
    try {
      await queueApi.adminDelete(roomUsername, queueId);
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const handleDeleteGroup = async (sessionId: string, requesterName: string) => {
    if (!roomUsername) return;
    if (confirm(`האם למחוק את כל השירים של ${requesterName}?`)) {
      try {
        await queueApi.deleteGroup(roomUsername, sessionId, requesterName);
      } catch (error) {
        console.error('Failed to delete group:', error);
      }
    }
  };

  const handleTruncateQueue = async () => {
    if (!roomUsername) return;
    if (confirm('האם לרוקן את כל התור? פעולה זו תמחק את כל הבקשות.')) {
      try {
        await queueApi.truncate(roomUsername);
      } catch (error) {
        console.error('Failed to truncate queue:', error);
      }
    }
  };

  if (isRoomLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>טוען חדר...</p>
      </div>
    );
  }

  if (roomError) {
    return (
      <div className="error-container">
        <h2>🚫 חדר לא נמצא</h2>
        <p>{roomError}</p>
      </div>
    );
  }

  if (!isRoomOwner) {
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
      <div className="queue-header">
        <h1>📋 תור הבקשות</h1>
        {queue.length > 0 && (
          <button 
            onClick={handleTruncateQueue}
            className="truncate-btn"
            title="רוקן את כל התור"
          >
            🗑️ רוקן תור
          </button>
        )}
      </div>
      
      {queue.length === 0 ? (
        <div className="empty-queue">
          <p>אין בקשות בתור</p>
        </div>
      ) : (
        <div className="queue-groups">
          {queue.map((group, groupIndex) => (
            <div key={`${group.sessionId}-${groupIndex}`} className="queue-group">
              <div className="group-header">
                <div className="group-info">
                  <span className="requester-name">{group.requesterName}</span>
                  <span className="request-count">{group.entries.length} שירים</span>
                </div>
                <button 
                  onClick={() => handleDeleteGroup(group.sessionId, group.requesterName)}
                  className="delete-group-btn"
                  title="מחק את כל השירים של מבקש זה"
                >
                  ✕
                </button>
              </div>
              <div className="group-entries">
                {group.entries.map(entry => (
                  <div 
                    key={entry.id} 
                    className={`queue-entry ${entry.status} ${entry.notes ? 'has-notes' : ''}`}
                  >
                    <div className="entry-info">
                      <span className="song-name">{entry.songName}</span>
                      <span className="song-artist">{entry.songArtist}</span>
                      {entry.notes && (
                        <span className="entry-notes">💬 {entry.notes}</span>
                      )}
                    </div>
                    <div className="entry-actions">
                      {entry.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handlePresent(entry.id)}
                            className="present-btn"
                          >
                            ▶ הצג
                          </button>
                          <button 
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="delete-entry-btn"
                            title="מחק שיר זה"
                          >
                            ✕
                          </button>
                        </>
                      )}
                      {entry.status === 'played' && (
                        <>
                          <span className="played-badge">✓ בוצע</span>
                          <button 
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="delete-entry-btn"
                            title="מחק שיר זה"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
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

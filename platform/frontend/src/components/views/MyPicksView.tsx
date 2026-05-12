import { useParams, Link } from 'react-router-dom';
import { useQueue } from '../../context/QueueContext';
import { useRoom } from '../../context/RoomContext';
import { queueApi } from '../../services/api';

export function MyPicksView() {
  const { myPicks, refreshMyPicks } = useQueue();
  const { roomUsername, roomError, isRoomLoading } = useRoom();
  const { username } = useParams<{ username: string }>();

  const handleDelete = async (queueId: number) => {
    if (!roomUsername) return;
    try {
      await queueApi.remove(roomUsername, queueId);
      refreshMyPicks();
    } catch (error) {
      console.error('Failed to delete pick:', error);
    }
  };

  if (isRoomLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>טוען...</p>
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

  const pending = myPicks.filter(e => e.status === 'pending');
  const played = myPicks.filter(e => e.status === 'played');
  const sorted = [...pending, ...played];

  return (
    <div className="my-picks-view">
      <h1>הבחירות שלי</h1>

      {sorted.length === 0 ? (
        <div className="empty-queue">
          <p>לא הוספת שירים לתור</p>
          <Link to={`/${username}`} className="back-to-search">חזרה לחיפוש</Link>
        </div>
      ) : (
        <div className="queue-groups">
          <div className="queue-group">
            <div className="group-entries">
              {sorted.map(entry => (
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
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="delete-entry-btn"
                        title="הסר מהתור"
                      >
                        ✕
                      </button>
                    )}
                    {entry.status === 'played' && (
                      <span className="played-badge">✓ בוצע</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

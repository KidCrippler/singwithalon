import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { songsApi, queueApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePlayingNow } from '../../context/PlayingNowContext';
import type { Song } from '../../types';

export function SearchView() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToQueue, setAddingToQueue] = useState<number | null>(null);
  const [requesterName, setRequesterName] = useState('');
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { setSong } = usePlayingNow();

  useEffect(() => {
    songsApi.list()
      .then(setSongs)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredSongs = useMemo(() => {
    if (!searchTerm.trim()) return songs;
    const term = searchTerm.toLowerCase();
    return songs.filter(song => 
      song.name.toLowerCase().includes(term) ||
      song.singer.toLowerCase().includes(term)
    );
  }, [songs, searchTerm]);

  const handleViewSong = (songId: number) => {
    navigate(`/song/${songId}`);
  };

  const handlePresentNow = (songId: number) => {
    setSong(songId);
    navigate('/playing-now');
  };

  const handleAddToQueue = async (songId: number) => {
    if (!requesterName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      await queueApi.add(songId, requesterName.trim());
      setAddingToQueue(null);
      setRequesterName('');
      alert('Song added to queue!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add to queue');
    }
  };

  const handleReloadSongs = async () => {
    setIsLoading(true);
    try {
      await songsApi.reload();
      const newSongs = await songsApi.list();
      setSongs(newSongs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload songs');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>טוען שירים...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>שגיאה: {error}</p>
        <button onClick={() => window.location.reload()}>נסה שוב</button>
      </div>
    );
  }

  return (
    <div className="search-view">
      <div className="search-header">
        <h1>🎤 שרים עם אלון</h1>
        <div className="search-controls">
          <input
            type="text"
            placeholder="חפש שיר או אמן..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {isAdmin && (
            <button onClick={handleReloadSongs} className="reload-btn">
              🔄 רענן
            </button>
          )}
        </div>
      </div>

      <div className="songs-list">
        {filteredSongs.length === 0 ? (
          <p className="no-results">לא נמצאו תוצאות</p>
        ) : (
          filteredSongs.map(song => (
            <div key={song.id} className="song-item">
              <div className="song-info" onClick={() => handleViewSong(song.id)}>
                <span className="song-name">{song.name}</span>
                <span className="song-artist">{song.singer}</span>
                {song.isPrivate && <span className="private-badge">🔒</span>}
              </div>
              <div className="song-actions">
                {isAdmin ? (
                  <button 
                    onClick={() => handlePresentNow(song.id)}
                    className="present-btn"
                  >
                    ▶ הצג עכשיו
                  </button>
                ) : (
                  addingToQueue === song.id ? (
                    <div className="queue-form">
                      <input
                        type="text"
                        placeholder="השם שלך"
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        className="name-input"
                      />
                      <button onClick={() => handleAddToQueue(song.id)}>✓</button>
                      <button onClick={() => setAddingToQueue(null)}>✕</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setAddingToQueue(song.id)}
                      className="queue-btn"
                    >
                      + לתור
                    </button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


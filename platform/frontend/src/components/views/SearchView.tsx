import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { queueApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useSearch } from '../../context/SearchContext';
import { useSongs } from '../../context/SongsContext';
import { QueueModal } from '../common/QueueModal';
import { ToastContainer, useToast } from '../common/Toast';
import type { Song } from '../../types';

export function SearchView() {
  const { songs, isLoading, error, reloadSongs } = useSongs();
  const { searchTerm, setSearchTerm, setFilteredCount } = useSearch();
  const [isReloading, setIsReloading] = useState(false);
  const [queueModalSong, setQueueModalSong] = useState<Song | null>(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { setSong, state } = usePlayingNow();
  const { toasts, showToast, dismissToast } = useToast();

  // Get song status class for coloring
  const getSongStatusClass = useCallback((songId: number): string => {
    // Priority: Green (playing) > Yellow (pending) > Grey (played)
    if (state.currentSongId === songId) {
      return 'song-status-playing';
    }
    if (state.pendingSongIds.includes(songId)) {
      return 'song-status-pending';
    }
    if (state.playedSongIds.includes(songId)) {
      return 'song-status-played';
    }
    return '';
  }, [state.currentSongId, state.pendingSongIds, state.playedSongIds]);

  // Check if a string starts with a Hebrew character
  const startsWithHebrew = (str: string): boolean => {
    const firstChar = str.trim().charAt(0);
    return /[\u0590-\u05FF]/.test(firstChar);
  };

  // Sort songs: Hebrew first (alphabetically), then English (alphabetically)
  // Also filter out private songs when in viewer mode (not admin)
  const sortedSongs = useMemo(() => {
    // Filter out private songs when not in admin mode
    const visibleSongs = isAdmin ? songs : songs.filter(song => !song.isPrivate);
    
    return [...visibleSongs].sort((a, b) => {
      const aIsHebrew = startsWithHebrew(a.name);
      const bIsHebrew = startsWithHebrew(b.name);
      
      // Hebrew songs come first
      if (aIsHebrew && !bIsHebrew) return -1;
      if (!aIsHebrew && bIsHebrew) return 1;
      
      // Within same group, sort alphabetically by name
      return a.name.localeCompare(b.name, aIsHebrew ? 'he' : 'en');
    });
  }, [songs, isAdmin]);

  const filteredSongs = useMemo(() => {
    if (!searchTerm.trim()) return sortedSongs;
    const term = searchTerm.toLowerCase();
    return sortedSongs.filter(song => 
      song.name.toLowerCase().includes(term) ||
      song.singer.toLowerCase().includes(term)
    );
  }, [sortedSongs, searchTerm]);

  // Update filtered count in context for Header to display
  useEffect(() => {
    setFilteredCount(filteredSongs.length);
  }, [filteredSongs.length, setFilteredCount]);

  const handleViewSong = (songId: number) => {
    navigate(`/song/${songId}`);
  };

  const handlePresentNow = (songId: number) => {
    setSearchTerm(''); // Clear search filter when presenting
    setSong(songId);
    navigate('/playing-now');
  };

  const handleQueueClick = (song: Song) => {
    setQueueModalSong(song);
  };

  const handleQueueSubmit = async (requesterName: string, notes: string) => {
    if (!queueModalSong) return;
    
    try {
      await queueApi.add(queueModalSong.id, requesterName, notes || undefined);
      showToast('השיר נוסף לתור בהצלחה!', 'success', queueModalSong.name);
      setQueueModalSong(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'משהו השתבש, נסה שוב';
      showToast(errorMessage, 'error');
      throw err; // Re-throw so modal knows submission failed
    }
  };

  const handleReloadSongs = async () => {
    setIsReloading(true);
    try {
      await reloadSongs();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה בטעינת שירים', 'error');
    } finally {
      setIsReloading(false);
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      <div className="search-header">
        <div className="search-controls">
          <input
            type="text"
            placeholder="חפש שיר או אמן..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button 
            className="search-clear-btn"
            onClick={() => setSearchTerm('')}
            title="נקה חיפוש"
          >
            נקה <span className="clear-icon">✕</span>
          </button>
          {isAdmin && (
            <button 
              onClick={handleReloadSongs} 
              className="reload-btn" 
              title="רענן רשימת שירים"
              disabled={isReloading}
            >
              {isReloading ? '...' : '🔄'}
            </button>
          )}
        </div>
      </div>

      <div className="songs-list">
        {filteredSongs.length === 0 ? (
          <p className="no-results">לא נמצאו תוצאות</p>
        ) : (
          filteredSongs.map(song => (
            <div key={song.id} className={`song-item ${getSongStatusClass(song.id)}`}>
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
                    title="הצג עכשיו"
                  >
                    ▶
                  </button>
                ) : (
                  <button 
                    onClick={() => handleQueueClick(song)}
                    className="queue-btn"
                    title="הוסף לתור"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Queue Modal */}
      <QueueModal
        isOpen={queueModalSong !== null}
        songName={queueModalSong?.name || ''}
        songArtist={queueModalSong?.singer || ''}
        onSubmit={handleQueueSubmit}
        onCancel={() => setQueueModalSong(null)}
      />
    </div>
  );
}

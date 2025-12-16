import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { queueApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useSearch } from '../../context/SearchContext';
import { useSongs } from '../../context/SongsContext';
import { useRoom } from '../../context/RoomContext';
import { QueueModal } from '../common/QueueModal';
import { ToastContainer, useToast } from '../common/Toast';
import { LoginView } from './LoginView';
import type { Song } from '../../types';

export function SearchView() {
  const { songs, isLoading, error, reloadSongs } = useSongs();
  const { searchTerm, setSearchTerm, setFilteredCount } = useSearch();
  const [isReloading, setIsReloading] = useState(false);
  const [queueModalSong, setQueueModalSong] = useState<Song | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const { isRoomOwner } = useAuth();
  const { setSong, state } = usePlayingNow();
  const { roomError, isRoomLoading } = useRoom();
  const { toasts, showToast, dismissToast } = useToast();

  // Check if this is an admin route (needs login)
  const isAdminRoute = window.location.pathname.endsWith('/admin');

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

  // Check if a song is new (created in last 3 months)
  const isNewSong = useCallback((dateCreated?: number): boolean => {
    if (!dateCreated) return false;
    const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days in ms
    return dateCreated > threeMonthsAgo;
  }, []);

  // Check if a string starts with a Hebrew character
  const startsWithHebrew = (str: string): boolean => {
    const firstChar = str.trim().charAt(0);
    return /[\u0590-\u05FF]/.test(firstChar);
  };

  // Sort songs: Hebrew first (alphabetically), then English (alphabetically)
  // Also filter out private songs when in viewer mode (not admin)
  const sortedSongs = useMemo(() => {
    // Filter out private songs when not room owner
    const visibleSongs = isRoomOwner ? songs : songs.filter(song => !song.isPrivate);
    
    return [...visibleSongs].sort((a, b) => {
      const aIsHebrew = startsWithHebrew(a.name);
      const bIsHebrew = startsWithHebrew(b.name);
      
      // Hebrew songs come first
      if (aIsHebrew && !bIsHebrew) return -1;
      if (!aIsHebrew && bIsHebrew) return 1;
      
      // Within same group, sort alphabetically by name
      return a.name.localeCompare(b.name, aIsHebrew ? 'he' : 'en');
    });
  }, [songs, isRoomOwner]);

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

  // Blur search input when user scrolls the song list (dismiss keyboard on tablets)
  useEffect(() => {
    const handleScroll = () => {
      if (document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    const scrollContainer = document.querySelector('.songs-list');
    scrollContainer?.addEventListener('scroll', handleScroll, { passive: true });

    return () => scrollContainer?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleViewSong = (songId: number) => {
    navigate(`/${username}/song/${songId}`);
  };

  const handlePresentNow = (songId: number) => {
    setSearchTerm(''); // Clear search filter when presenting
    setSong(songId);
    navigate(`/${username}/playing-now`);
  };

  const handleQueueClick = (song: Song) => {
    setQueueModalSong(song);
  };

  const handleQueueSubmit = async (requesterName: string, notes: string) => {
    if (!queueModalSong || !username) return;
    
    try {
      await queueApi.add(username, queueModalSong.id, requesterName, notes || undefined);
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

  // First check room loading/error state before showing anything
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

  // Show login view if on admin route and not authenticated as room owner
  if (isAdminRoute && !isRoomOwner) {
    return <LoginView />;
  }

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
            ref={searchInputRef}
            type="text"
            placeholder="חפש שיר או אמן..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              }
            }}
            className="search-input"
          />
          <button 
            className="search-clear-btn"
            onClick={() => setSearchTerm('')}
            title="נקה חיפוש"
          >
            נקה <span className="clear-icon">✕</span>
          </button>
          {isRoomOwner && (
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
              </div>
              <div className="song-badges">
                {isNewSong(song.dateCreated) && <span className="new-badge">חדש</span>}
                {song.isPrivate && <span className="private-badge">🔒</span>}
              </div>
              <div className="song-actions">
                {isRoomOwner ? (
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

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { songsApi, queueApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePlayingNow } from '../../context/PlayingNowContext';
import type { Song, ParsedSong } from '../../types';

export function SongView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { setSong } = usePlayingNow();
  
  const [song, setSongData] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<ParsedSong | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'lyrics' | 'chords'>('chords');
  const [requesterName, setRequesterName] = useState('');
  const [showQueueForm, setShowQueueForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const songId = parseInt(id, 10);
    setIsLoading(true);
    
    Promise.all([
      songsApi.get(songId),
      songsApi.getLyrics(songId),
    ])
      .then(([songData, lyricsData]) => {
        setSongData(songData);
        setLyrics(lyricsData);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handlePresentNow = () => {
    if (!id) return;
    setSong(parseInt(id, 10));
    navigate('/playing-now');
  };

  const handleAddToQueue = async () => {
    if (!id || !requesterName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      await queueApi.add(parseInt(id, 10), requesterName.trim());
      setShowQueueForm(false);
      setRequesterName('');
      alert('Song added to queue!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add to queue');
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>טוען שיר...</p>
      </div>
    );
  }

  if (error || !song || !lyrics) {
    return (
      <div className="error-container">
        <p>שגיאה: {error || 'Song not found'}</p>
        <button onClick={() => navigate(-1)}>חזור</button>
      </div>
    );
  }

  const isRtl = lyrics.metadata.direction === 'rtl';

  return (
    <div className={`song-view ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* Top bar */}
      <div className="song-top-bar">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← חזור
        </button>
        
        <div className="mode-toggle">
          <button 
            className={displayMode === 'lyrics' ? 'active' : ''}
            onClick={() => setDisplayMode('lyrics')}
          >
            מילים
          </button>
          <button 
            className={displayMode === 'chords' ? 'active' : ''}
            onClick={() => setDisplayMode('chords')}
          >
            אקורדים
          </button>
        </div>

        <div className="action-buttons">
          {isAdmin ? (
            <button onClick={handlePresentNow} className="present-btn">
              ▶ הצג עכשיו
            </button>
          ) : showQueueForm ? (
            <div className="queue-form-inline">
              <input
                type="text"
                placeholder="השם שלך"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
              />
              <button onClick={handleAddToQueue}>✓</button>
              <button onClick={() => setShowQueueForm(false)}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowQueueForm(true)} className="queue-btn">
              + הוסף לתור
            </button>
          )}
        </div>
      </div>

      {/* Song header */}
      <div className="song-header">
        <h1>{lyrics.metadata.title}</h1>
        <h2>{lyrics.metadata.artist}</h2>
        {lyrics.metadata.credits && (
          <p className="credits">{lyrics.metadata.credits}</p>
        )}
      </div>

      {/* Lyrics display */}
      <div className={`lyrics-container ${displayMode}`}>
        {lyrics.lines.map((line, index) => {
          // In lyrics mode, hide directives and chord-only lines
          if (displayMode === 'lyrics') {
            if (line.type === 'directive') return null;
            if (line.type === 'chords') return null;
          }

          // Get the text content, trimming in lyrics mode
          const getText = () => {
            if (displayMode === 'lyrics') {
              return line.text.trim();
            }
            return line.type === 'chords' ? (line.raw || line.text) : line.text;
          };

          return (
            <div key={index} className={`line line-${line.type}`}>
              {line.type === 'directive' ? (
                <span className="directive">{line.text}</span>
              ) : line.type === 'chords' ? (
                <span className="chords">{line.raw || line.text}</span>
              ) : line.type === 'empty' ? (
                <br />
              ) : (
                <span className="lyric">{getText()}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


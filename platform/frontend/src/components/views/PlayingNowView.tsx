import { useState, useEffect } from 'react';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useAuth } from '../../context/AuthContext';
import { songsApi } from '../../services/api';
import type { ParsedSong } from '../../types';

export function PlayingNowView() {
  const { state, nextVerse, prevVerse, setDisplayMode } = usePlayingNow();
  const { isAdmin } = useAuth();
  const [lyrics, setLyrics] = useState<ParsedSong | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (state.currentSongId) {
      setIsLoading(true);
      songsApi.getLyrics(state.currentSongId)
        .then(setLyrics)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setLyrics(null);
    }
  }, [state.currentSongId]);

  // No song playing - show splash screen
  if (!state.currentSongId) {
    return (
      <div className="playing-now-splash">
        <div className="splash-content">
          <h1>🎤 שרים עם אלון</h1>
          <p>ממתין לשיר...</p>
          <div className="qr-placeholder">
            <span>QR Code</span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !lyrics) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>טוען שיר...</p>
      </div>
    );
  }

  const isRtl = lyrics.metadata.direction === 'rtl';

  return (
    <div className={`playing-now-view ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* Admin controls overlay */}
      {isAdmin && (
        <div className="admin-controls">
          <button onClick={prevVerse} title="פסוק קודם">◀</button>
          <button onClick={nextVerse} title="פסוק הבא">▶</button>
          <button 
            onClick={() => setDisplayMode(state.displayMode === 'lyrics' ? 'chords' : 'lyrics')}
            title="החלף מצב תצוגה"
          >
            {state.displayMode === 'lyrics' ? '🎸' : '🎤'}
          </button>
        </div>
      )}

      {/* Song header */}
      <div className="song-header">
        <h1>{lyrics.metadata.title}</h1>
        <h2>{lyrics.metadata.artist}</h2>
        {lyrics.metadata.credits && (
          <p className="credits">{lyrics.metadata.credits}</p>
        )}
      </div>

      {/* Lyrics display */}
      <div className={`lyrics-container ${state.displayMode}`}>
        {lyrics.lines.map((line, index) => {
          // In lyrics mode, hide directives and chord-only lines
          if (state.displayMode === 'lyrics') {
            if (line.type === 'directive') return null;
            if (line.type === 'chords') return null;
          }

          // Get the text content, trimming in lyrics mode
          const getText = () => {
            if (state.displayMode === 'lyrics') {
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

      {/* Verse indicator */}
      <div className="verse-indicator">
        פסוק {state.currentVerseIndex + 1} / {lyrics.verseBreaks.length || 1}
      </div>
    </div>
  );
}


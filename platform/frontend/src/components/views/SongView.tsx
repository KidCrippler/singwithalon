import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { songsApi, queueApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useSearch } from '../../context/SearchContext';
import { formatCredits } from '../../utils/formatCredits';
import { groupIntoSections } from '../../utils/songDisplay';
import { useDynamicFontSize } from '../../hooks/useDynamicFontSize';
import { TransposeControls } from '../TransposeControls';
import { getSongBackground } from '../../utils/backgrounds';
import { requestFullscreen, exitFullscreen as exitFullscreenUtil, addFullscreenChangeListener, isInFullscreen } from '../../utils/fullscreen';
import { QueueModal } from '../common/QueueModal';
import { ToastContainer, useToast } from '../common/Toast';
import { FullscreenExitButton } from '../common/FullscreenExitButton';
import { ChordsFullscreenHeader } from '../common/ChordsFullscreenHeader';
import { LineDisplay } from '../common/LineDisplay';
import type { Song, ParsedSong } from '../../types';

export function SongView() {
  const { id, username } = useParams<{ id: string; username: string }>();
  const navigate = useNavigate();
  const { isRoomOwner } = useAuth();
  const { setSong } = usePlayingNow();
  const { setSearchTerm } = useSearch();
  
  const [song, setSongData] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<ParsedSong | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Admin defaults to chords mode, viewer defaults to lyrics mode
  const [displayMode, setDisplayMode] = useState<'lyrics' | 'chords'>(isRoomOwner ? 'chords' : 'lyrics');
  const [keyOffset, setKeyOffset] = useState(0);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [currentBackground, setCurrentBackground] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();
  
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lyricsFullscreenContainerRef = useRef<HTMLDivElement>(null);
  const chordsFullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen mode - select appropriate container based on current mode
  // Uses cross-browser utility for webkit/moz/ms vendor prefix support (older tablets)
  const enterFullscreen = useCallback(() => {
    const container = displayMode === 'lyrics' 
      ? lyricsFullscreenContainerRef.current 
      : chordsFullscreenContainerRef.current;
    
    requestFullscreen(container);
  }, [displayMode]);

  // Exit fullscreen - uses cross-browser utility
  const exitFullscreen = useCallback(() => {
    exitFullscreenUtil();
  }, []);

  // Listen for fullscreen changes (including Escape key exit)
  // Uses cross-browser utility for all vendor prefixes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isInFullscreen());
    };
    
    return addFullscreenChangeListener(handleFullscreenChange);
  }, []);

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
        // Load song-specific background (falls back to random pastoral)
        getSongBackground(songId).then(setCurrentBackground);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  // Group lines into sections
  const sections = useMemo(() => {
    if (!lyrics) return [];
    return groupIntoSections(lyrics.lines, displayMode === 'chords');
  }, [lyrics, displayMode]);

  // Dynamic font sizing - ensures content fits without scrolling
  useDynamicFontSize(lyricsContainerRef, [sections, displayMode]);

  const handlePresentNow = () => {
    if (!id) return;
    setSearchTerm(''); // Clear search filter when presenting
    setSong(parseInt(id, 10), 'song_view');
    navigate(`/${username}/playing-now`);
  };

  const handleQueueSubmit = async (requesterName: string, notes: string) => {
    if (!id || !song || !username) return;
    
    try {
      await queueApi.add(username, parseInt(id, 10), requesterName, notes || undefined);
      showToast('השיר נוסף לתור בהצלחה!', 'success', song.name);
      setShowQueueModal(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'משהו השתבש, נסה שוב';
      showToast(errorMessage, 'error');
      throw err; // Re-throw so modal knows submission failed
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      {/* Compact top bar with song info */}
      <div className="song-top-bar">
        <button onClick={() => navigate(-1)} className="back-btn">
          ←
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

        {/* Transpose controls - only in chords mode */}
        {displayMode === 'chords' && (
          <TransposeControls
            currentOffset={keyOffset}
            adminOffset={0}
            isAdmin={false}
            onOffsetChange={setKeyOffset}
          />
        )}

        {/* Song title inline */}
        <div className="song-title-compact">
          {lyrics.metadata.title}
          <span className="artist"> - {lyrics.metadata.artist}</span>
          {(song.composers?.length || song.lyricists?.length || song.translators?.length) && (
            <span className="credits-compact">
              {' | '}{formatCredits(song, isRtl)}
            </span>
          )}
        </div>

        <div className="action-buttons">
          {/* Fullscreen button */}
          <button
            onClick={enterFullscreen}
            title="מסך מלא"
            className="fullscreen-btn song-view-fullscreen"
            aria-label="מסך מלא"
          />
          {isRoomOwner ? (
            <button onClick={handlePresentNow} className="present-btn">
              ▶ הצג
            </button>
          ) : (
            <button onClick={() => setShowQueueModal(true)} className="queue-btn">
              +
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen lyrics - NO SCROLLING */}
      {/* In lyrics mode, wrap with fullscreen container for pastoral styling */}
      {displayMode === 'lyrics' ? (
        <div 
          ref={lyricsFullscreenContainerRef}
          className={`fullscreen-container song-view-fullscreen-container ${isFullscreen ? 'is-fullscreen' : ''}`}
          style={currentBackground ? { '--viewer-bg': `url('${currentBackground}')` } as React.CSSProperties : undefined}
        >
          {/* Exit button - only visible in fullscreen */}
          {isFullscreen && (
            <FullscreenExitButton onExit={exitFullscreen} variant="light" />
          )}
          
          {/* Song metadata header - only visible in fullscreen */}
          {isFullscreen && (
            <div className={`fullscreen-song-header ${isRtl ? 'rtl' : 'ltr'}`}>
              <h1 className="fullscreen-title">{lyrics.metadata.title}</h1>
              <div className="fullscreen-artist">{lyrics.metadata.artist}</div>
              {(song.composers?.length || song.lyricists?.length || song.translators?.length) && (
                <div className="fullscreen-credits">{formatCredits(song, isRtl)}</div>
              )}
            </div>
          )}

          <div 
            ref={lyricsContainerRef}
            className="lyrics-container lyrics"
          >
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="lyrics-section">
                {section.map((line, lineIndex) => (
                  <LineDisplay
                    key={lineIndex}
                    line={line}
                    showChords={false}
                    lineIndex={lineIndex}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div 
          ref={chordsFullscreenContainerRef}
          className={`chords-fullscreen-container song-view-fullscreen-container ${isFullscreen ? 'is-fullscreen' : ''}`}
        >
          {/* Exit button - only visible in fullscreen */}
          {isFullscreen && (
            <FullscreenExitButton onExit={exitFullscreen} variant="dark" />
          )}
          
          {/* Compact header - only visible in fullscreen */}
          {isFullscreen && (
            <ChordsFullscreenHeader
              title={lyrics.metadata.title}
              artist={lyrics.metadata.artist}
              song={song}
              isRtl={isRtl}
            />
          )}

          <div 
            ref={lyricsContainerRef}
            className={`lyrics-container chords ${isFullscreen ? 'in-fullscreen' : ''}`}
          >
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="lyrics-section">
                {section.map((line, lineIndex) => (
                  <LineDisplay
                    key={lineIndex}
                    line={line}
                    showChords={true}
                    lineIndex={lineIndex}
                    keyOffset={keyOffset}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue Modal */}
      <QueueModal
        isOpen={showQueueModal}
        songName={song.name}
        songArtist={song.singer}
        onSubmit={handleQueueSubmit}
        onCancel={() => setShowQueueModal(false)}
      />
    </div>
  );
}

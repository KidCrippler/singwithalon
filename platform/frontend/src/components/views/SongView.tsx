import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { songsApi, queueApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useSearch } from '../../context/SearchContext';
import { formatCredits } from '../../utils/formatCredits';
import { transposeChordLine } from '../../services/transpose';
import { formatChordLineForDisplay, segmentChordLine } from '../../services/chordDisplay';
import { TransposeControls } from '../TransposeControls';
import { getSongBackground } from '../../utils/backgrounds';
import { QueueModal } from '../common/QueueModal';
import { ToastContainer, useToast } from '../common/Toast';
import { FullscreenExitButton } from '../common/FullscreenExitButton';
import { ChordsFullscreenHeader } from '../common/ChordsFullscreenHeader';
import type { Song, ParsedSong, ParsedLine } from '../../types';

// Hook for dynamic font sizing - finds optimal columns (1-5) + font size combination
function useDynamicFontSize(containerRef: React.RefObject<HTMLDivElement | null>, deps: unknown[]) {
  const calculateOptimalLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const availableHeight = container.clientHeight;
    const availableWidth = container.clientWidth;
    if (availableHeight === 0 || availableWidth === 0) return;
    
    // Get container padding and gap for accurate width calculation
    const containerStyle = getComputedStyle(container);
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(containerStyle.paddingRight) || 0;
    const columnGap = parseFloat(containerStyle.columnGap) || 16;
    
    // Try each column count from 8 down to 1, find best font size for each
    // More columns = narrower columns but potentially larger font if content fits
    let bestColumns = 1;
    let bestFontSize = 6;
    
    for (let cols = 8; cols >= 1; cols--) {
      container.style.columnCount = String(cols);
      
      // Calculate actual column width accounting for gaps
      const totalGaps = (cols - 1) * columnGap;
      const columnWidth = (availableWidth - paddingLeft - paddingRight - totalGaps) / cols;
      
      // Binary search for optimal font size with this column count
      let min = 6;
      let max = 60;
      let optimalForCols = 6;
      
      while (min <= max) {
        const mid = Math.floor((min + max) / 2);
        container.style.setProperty('--dynamic-font-size', `${mid}px`);
        void container.offsetHeight;
        
        // Check vertical fit
        const fitsVertically = container.scrollHeight <= availableHeight + 5;
        
        // Check horizontal fit - measure actual text span widths against column width
        const textSpans = container.querySelectorAll('.lyric, .cue, .chords');
        let fitsHorizontally = true;
        for (const span of textSpans) {
          const spanWidth = span.getBoundingClientRect().width;
          if (spanWidth > columnWidth) {
            fitsHorizontally = false;
            break;
          }
        }
        
        if (fitsVertically && fitsHorizontally) {
          optimalForCols = mid;
          min = mid + 1;
        } else {
          max = mid - 1;
        }
      }
      
      // If this column count gives a better (larger) font, use it
      if (optimalForCols > bestFontSize) {
        bestFontSize = optimalForCols;
        bestColumns = cols;
      }
    }
    
    // Apply the best combination
    container.style.columnCount = String(bestColumns);
    container.style.setProperty('--dynamic-font-size', `${bestFontSize}px`);
  }, [containerRef]);
  
  useEffect(() => {
    const timeoutId = setTimeout(calculateOptimalLayout, 50);
    
    const handleResize = () => {
      requestAnimationFrame(calculateOptimalLayout);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateOptimalLayout, ...deps]);
}

// Group lines into sections (verses) separated by empty lines or directives/cues
function groupIntoSections(lines: ParsedLine[], displayMode: 'lyrics' | 'chords'): ParsedLine[][] {
  const sections: ParsedLine[][] = [];
  let currentSection: ParsedLine[] = [];

  for (const line of lines) {
    // In lyrics mode, skip {} directives and chord-only lines
    // But keep [] cues (they show in both modes)
    if (displayMode === 'lyrics') {
      if (line.type === 'directive' || line.type === 'chords') continue;
    }

    // Empty line marks end of section
    if (line.type === 'empty') {
      if (currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
      continue;
    }

    // Directive or cue starts a new section
    if (line.type === 'directive' || line.type === 'cue') {
      if (currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
    }

    currentSection.push(line);
  }

  // Don't forget the last section
  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

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
  const [displayMode, setDisplayMode] = useState<'lyrics' | 'chords'>('lyrics'); // Default to lyrics for viewers
  const [keyOffset, setKeyOffset] = useState(0);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [currentBackground, setCurrentBackground] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toasts, showToast, dismissToast } = useToast();
  
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lyricsFullscreenContainerRef = useRef<HTMLDivElement>(null);
  const chordsFullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen mode - select appropriate container based on current mode
  const enterFullscreen = useCallback(() => {
    const container = displayMode === 'lyrics' 
      ? lyricsFullscreenContainerRef.current 
      : chordsFullscreenContainerRef.current;
    
    if (container && container.requestFullscreen) {
      container.requestFullscreen().catch(console.error);
    }
  }, [displayMode]);

  // Exit fullscreen
  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  // Listen for fullscreen changes (including Escape key exit)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
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
    return groupIntoSections(lyrics.lines, displayMode);
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
                {section.map((line, lineIndex) => {
                  const getText = () => {
                    // In lyrics mode: trim and collapse consecutive spaces to single space
                    return line.text.trim().replace(/ {2,}/g, ' ');
                  };

                  return (
                    <div key={lineIndex} className={`line line-${line.type}`}>
                      {line.type === 'cue' ? (
                        <span className="cue">{line.text}</span>
                      ) : (
                        <span className="lyric">{getText()}</span>
                      )}
                    </div>
                  );
                })}
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
                {section.map((line, lineIndex) => {
                  const getText = () => {
                    return line.type === 'chords' ? (line.raw || line.text) : line.text;
                  };

                  const getChordSegments = () => {
                    const chordText = line.raw || line.text;
                    const transposedAndFormatted = formatChordLineForDisplay(transposeChordLine(chordText, keyOffset));
                    return segmentChordLine(transposedAndFormatted);
                  };

                  return (
                    <div key={lineIndex} className={`line line-${line.type}`}>
                      {line.type === 'directive' ? (
                        <span className="directive">{line.text}</span>
                      ) : line.type === 'cue' ? (
                        <span className="cue">{line.text}</span>
                      ) : line.type === 'chords' ? (
                        // Render chord line with inline directives styled separately
                        getChordSegments().map((segment, i) => (
                          segment.type === 'directive' ? (
                            <span key={i} className="directive">{segment.text}</span>
                          ) : (
                            <span key={i} className="chords">{segment.text}</span>
                          )
                        ))
                      ) : (
                        <span className="lyric">{getText()}</span>
                      )}
                    </div>
                  );
                })}
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

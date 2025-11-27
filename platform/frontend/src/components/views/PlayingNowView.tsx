import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useAuth } from '../../context/AuthContext';
import { songsApi } from '../../services/api';
import type { ParsedSong, ParsedLine } from '../../types';

// Hook for dynamic font sizing - finds optimal columns (1-5) + font size combination
function useDynamicFontSize(containerRef: React.RefObject<HTMLDivElement | null>, deps: unknown[]) {
  const calculateOptimalLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const availableHeight = container.clientHeight;
    const availableWidth = container.clientWidth;
    if (availableHeight === 0 || availableWidth === 0) return;
    
    // Try each column count from 5 down to 1, find best font size for each
    let bestColumns = 1;
    let bestFontSize = 6;
    
    for (let cols = 5; cols >= 1; cols--) {
      container.style.columnCount = String(cols);
      
      // Binary search for optimal font size with this column count
      let min = 6;
      let max = 40;
      let optimalForCols = 6;
      
      while (min <= max) {
        const mid = Math.floor((min + max) / 2);
        container.style.setProperty('--dynamic-font-size', `${mid}px`);
        void container.offsetHeight;
        
        // Check vertical fit
        const fitsVertically = container.scrollHeight <= availableHeight + 5;
        
        // Check horizontal fit (no line cutting)
        const lines = container.querySelectorAll('.line');
        let fitsHorizontally = true;
        for (const line of lines) {
          if (line.scrollWidth > line.clientWidth + 2) {
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

// Group lines into sections (verses) separated by empty lines or directives
function groupIntoSections(lines: ParsedLine[], displayMode: 'lyrics' | 'chords'): ParsedLine[][] {
  const sections: ParsedLine[][] = [];
  let currentSection: ParsedLine[] = [];

  for (const line of lines) {
    // In lyrics mode, skip directives and chord-only lines entirely
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

    // Directive starts a new section
    if (line.type === 'directive') {
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

export function PlayingNowView() {
  const { state, nextVerse, prevVerse, setDisplayMode } = usePlayingNow();
  const { isAdmin } = useAuth();
  const [lyrics, setLyrics] = useState<ParsedSong | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

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

  // Group lines into sections
  const sections = useMemo(() => {
    if (!lyrics) return [];
    return groupIntoSections(lyrics.lines, state.displayMode);
  }, [lyrics, state.displayMode]);

  // Dynamic font sizing - ensures content fits without scrolling
  useDynamicFontSize(lyricsContainerRef, [sections, state.displayMode]);

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
      {/* Compact top bar with song info and admin controls */}
      <div className="song-top-bar">
        {/* Admin controls inline */}
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

        {/* Song title inline */}
        <div className="song-title-compact">
          {lyrics.metadata.title}
          <span className="artist"> - {lyrics.metadata.artist}</span>
        </div>
      </div>

      {/* Fullscreen lyrics - NO SCROLLING */}
      <div 
        ref={lyricsContainerRef}
        className={`lyrics-container ${state.displayMode}`}
      >
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="lyrics-section">
            {section.map((line, lineIndex) => {
              const getText = () => {
                if (state.displayMode === 'lyrics') {
                  return line.text.trim();
                }
                return line.type === 'chords' ? (line.raw || line.text) : line.text;
              };

              return (
                <div key={lineIndex} className={`line line-${line.type}`}>
                  {line.type === 'directive' ? (
                    <span className="directive">{line.text}</span>
                  ) : line.type === 'chords' ? (
                    <span className="chords">{line.raw || line.text}</span>
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
  );
}

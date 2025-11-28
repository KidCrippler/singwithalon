import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useAuth } from '../../context/AuthContext';
import { songsApi } from '../../services/api';
import { calculateVerses, getVerseLines, findVerseForLine } from '../../utils/verseCalculator';
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

// Hook for verse-mode font sizing - single column, maximize for readability
function useVerseFontSize(containerRef: React.RefObject<HTMLDivElement | null>, deps: unknown[]) {
  const calculateFontSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const availableHeight = container.clientHeight;
    const availableWidth = container.clientWidth;
    if (availableHeight === 0 || availableWidth === 0) return;
    
    // Single column for verse mode
    container.style.columnCount = '1';
    
    // Binary search for optimal font size
    let min = 12;
    let max = 80; // Larger max for verse mode
    let optimalSize = 12;
    
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
        optimalSize = mid;
        min = mid + 1;
      } else {
        max = mid - 1;
      }
    }
    
    container.style.setProperty('--dynamic-font-size', `${optimalSize}px`);
  }, [containerRef]);
  
  useEffect(() => {
    const timeoutId = setTimeout(calculateFontSize, 50);
    
    const handleResize = () => {
      requestAnimationFrame(calculateFontSize);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateFontSize, ...deps]);
}

// Group lines into sections for full-song display
function groupIntoSections(lines: ParsedLine[], showChords: boolean): ParsedLine[][] {
  const sections: ParsedLine[][] = [];
  let currentSection: ParsedLine[] = [];

  for (const line of lines) {
    // In lyrics mode, skip {} directives and chord-only lines
    if (!showChords) {
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

  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

// Render a single line with optional click handler
interface LineDisplayProps {
  line: ParsedLine;
  showChords: boolean;
  lineIndex: number;
  onClick?: (lineIndex: number) => void;
  isHighlighted?: boolean;
}

function LineDisplay({ line, showChords, lineIndex, onClick, isHighlighted }: LineDisplayProps) {
  const getText = () => {
    if (!showChords) {
      return line.text.trim();
    }
    return line.type === 'chords' ? (line.raw || line.text) : line.text;
  };

  return (
    <div 
      className={`line line-${line.type} ${isHighlighted ? 'verse-highlighted' : ''}`}
      onClick={() => onClick?.(lineIndex)}
      data-line-index={lineIndex}
    >
      {line.type === 'directive' ? (
        <span className="directive">{line.text}</span>
      ) : line.type === 'cue' ? (
        <span className="cue">{line.text}</span>
      ) : line.type === 'chords' ? (
        <span className="chords">{line.raw || line.text}</span>
      ) : (
        <span className="lyric">{getText()}</span>
      )}
    </div>
  );
}

export function PlayingNowView() {
  const { 
    state, 
    effectiveVersesEnabled,
    viewerVerseOverride,
    setViewerVerseOverride,
    nextVerse, 
    prevVerse, 
    setVerse,
    setDisplayMode,
    toggleVersesEnabled,
  } = usePlayingNow();
  const { isAdmin } = useAuth();
  const [lyrics, setLyrics] = useState<ParsedSong | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prevVerseIndex, setPrevVerseIndex] = useState(0);
  const adminContainerRef = useRef<HTMLDivElement>(null);
  const viewerFullContainerRef = useRef<HTMLDivElement>(null);
  const viewerVerseContainerRef = useRef<HTMLDivElement>(null);

  // Track previous verse for animation direction
  useEffect(() => {
    setPrevVerseIndex(state.currentVerseIndex);
  }, [state.currentVerseIndex]);

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

  // Calculate verses
  const linesPerVerse = state.projectorLinesPerVerse ?? 8;
  const verses = useMemo(() => {
    if (!lyrics) return [];
    return calculateVerses(lyrics.lines, linesPerVerse);
  }, [lyrics, linesPerVerse]);

  // Get current verse (clamped to valid range)
  const currentVerseIndex = Math.min(state.currentVerseIndex, Math.max(0, verses.length - 1));
  const currentVerse = verses[currentVerseIndex];

  // Group lines into sections for admin (always chords) and viewer full lyrics
  const adminSections = useMemo(() => {
    if (!lyrics) return [];
    return groupIntoSections(lyrics.lines, true); // Always show chords for admin
  }, [lyrics]);

  const viewerLyricsSections = useMemo(() => {
    if (!lyrics) return [];
    return groupIntoSections(lyrics.lines, false); // No chords for viewer lyrics mode
  }, [lyrics]);

  // Determine viewer mode
  const viewerShowsChords = state.displayMode === 'chords';
  const viewerShowsSingleVerse = !viewerShowsChords && effectiveVersesEnabled;

  // Should admin show purple highlight?
  // Only when: displayMode is 'lyrics' AND versesEnabled is true
  const showPurpleHighlight = state.displayMode === 'lyrics' && state.versesEnabled;

  // Dynamic font sizing for admin view (always multi-column chords)
  useDynamicFontSize(adminContainerRef, [adminSections, showPurpleHighlight, currentVerseIndex]);

  // Dynamic font sizing for viewer full view (chords or full lyrics)
  useDynamicFontSize(viewerFullContainerRef, [
    viewerShowsChords ? adminSections : viewerLyricsSections, 
    viewerShowsChords
  ]);

  // Verse font sizing for viewer single-verse mode
  useVerseFontSize(viewerVerseContainerRef, [currentVerse, viewerShowsSingleVerse]);

  // Animation direction for viewer verse mode
  const animationDirection = state.currentVerseIndex > prevVerseIndex ? 'slide-up' : 'slide-down';

  // Handle click on line to navigate to verse (admin only)
  const handleLineClick = useCallback((lineIndex: number) => {
    if (!isAdmin || !showPurpleHighlight) return;
    const verseIdx = findVerseForLine(verses, lineIndex);
    if (verseIdx >= 0) {
      setVerse(verseIdx);
    }
  }, [isAdmin, showPurpleHighlight, verses, setVerse]);

  // Check if a line is in the current verse (for highlighting)
  const isLineInCurrentVerse = useCallback((lineIndex: number): boolean => {
    if (!currentVerse) return false;
    return lineIndex >= currentVerse.startIndex && lineIndex <= currentVerse.endIndex;
  }, [currentVerse]);

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
  const isAtFirstVerse = currentVerseIndex === 0;
  const isAtLastVerse = currentVerseIndex >= verses.length - 1;

  // Build line index map for admin view (to track original indices through sections)
  let adminLineIndex = 0;
  const getAdminLineIndex = () => {
    const idx = adminLineIndex;
    adminLineIndex++;
    return idx;
  };

  return (
    <div className={`playing-now-view ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* Compact top bar with song info and admin controls */}
      <div className="song-top-bar">
        {/* Admin controls inline */}
        {isAdmin && (
          <div className="admin-controls">
            <button 
              onClick={prevVerse} 
              title="פסוק קודם"
              disabled={!state.versesEnabled || isAtFirstVerse}
              className={!state.versesEnabled || isAtFirstVerse ? 'disabled' : ''}
            >
              ◀
            </button>
            <button 
              onClick={nextVerse} 
              title="פסוק הבא"
              disabled={!state.versesEnabled || isAtLastVerse}
              className={!state.versesEnabled || isAtLastVerse ? 'disabled' : ''}
            >
              ▶
            </button>
            <button 
              onClick={toggleVersesEnabled}
              title={state.versesEnabled ? "בטל מצב פסוקים" : "הפעל מצב פסוקים"}
              className={state.versesEnabled ? 'active' : ''}
            >
              📖
            </button>
            <button 
              onClick={() => setDisplayMode(state.displayMode === 'lyrics' ? 'chords' : 'lyrics')}
              title={state.displayMode === 'lyrics' ? "הצג אקורדים לצופים" : "הצג מילים לצופים"}
            >
              {state.displayMode === 'lyrics' ? '🎸' : '🎤'}
            </button>
            {/* Verse indicator - only when verses enabled */}
            {state.versesEnabled && verses.length > 0 && (
              <span className="verse-indicator">
                {currentVerseIndex + 1}/{verses.length}
              </span>
            )}
          </div>
        )}

        {/* Viewer controls - only show when admin has verses enabled and user is not admin */}
        {!isAdmin && state.versesEnabled && state.displayMode === 'lyrics' && (
          <div className="viewer-controls">
            <button
              onClick={() => setViewerVerseOverride(viewerVerseOverride === false ? null : false)}
              title={viewerVerseOverride === false ? "הפעל מצב פסוקים" : "הצג שיר מלא"}
              className={viewerVerseOverride === false ? '' : 'active'}
            >
              {viewerVerseOverride === false ? '📄' : '📖'}
            </button>
          </div>
        )}

        {/* Song title inline */}
        <div className="song-title-compact">
          {lyrics.metadata.title}
          <span className="artist"> - {lyrics.metadata.artist}</span>
        </div>
      </div>

      {/* === ADMIN VIEW: Always shows chords with multi-column layout === */}
      {isAdmin && (
        <div 
          ref={adminContainerRef}
          className={`lyrics-container chords ${showPurpleHighlight ? 'with-verse-highlight' : ''}`}
        >
          {(() => {
            // Reset line counter for each render
            adminLineIndex = 0;
            return adminSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="lyrics-section">
                {section.map((line) => {
                  const lineIdx = getAdminLineIndex();
                  const isHighlighted = showPurpleHighlight && isLineInCurrentVerse(lineIdx);
                  return (
                    <LineDisplay 
                      key={lineIdx}
                      line={line} 
                      showChords={true}
                      lineIndex={lineIdx}
                      onClick={showPurpleHighlight ? handleLineClick : undefined}
                      isHighlighted={isHighlighted}
                    />
                  );
                })}
              </div>
            ));
          })()}
        </div>
      )}

      {/* === VIEWER VIEW: 3 modes === */}
      {!isAdmin && (
        <>
          {/* Mode 1: Chords enabled - same as admin, multi-column, no highlight */}
          {viewerShowsChords && (
            <div 
              ref={viewerFullContainerRef}
              className="lyrics-container chords"
            >
              {adminSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="lyrics-section">
                  {section.map((line, lineIndex) => (
                    <LineDisplay 
                      key={lineIndex}
                      line={line} 
                      showChords={true}
                      lineIndex={lineIndex}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Mode 2: Lyrics, verses off - full lyrics view */}
          {!viewerShowsChords && !viewerShowsSingleVerse && (
            <div 
              ref={viewerFullContainerRef}
              className="lyrics-container lyrics"
            >
              {viewerLyricsSections.map((section, sectionIndex) => (
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
          )}

          {/* Mode 3: Lyrics, verses on - single verse, centered */}
          {viewerShowsSingleVerse && (
            <div 
              ref={viewerVerseContainerRef}
              className={`lyrics-container lyrics verse-single ${animationDirection}`}
              key={currentVerseIndex} // Force re-render for animation
            >
              {currentVerse && getVerseLines(lyrics.lines, currentVerse, true).map((line, lineIndex) => (
                <LineDisplay 
                  key={lineIndex}
                  line={line} 
                  showChords={false}
                  lineIndex={lineIndex}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

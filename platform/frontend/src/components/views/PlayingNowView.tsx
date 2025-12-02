import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useAuth } from '../../context/AuthContext';
import { songsApi } from '../../services/api';
import { calculateVerses, calculateVersesForLyricsMode, getVerseLinesForDisplay, findVerseForLine, DEFAULT_LINES_PER_VERSE } from '../../utils/verseCalculator';
import { formatCredits } from '../../utils/formatCredits';
import { transposeChordLine } from '../../services/transpose';
import { formatChordLineForDisplay } from '../../services/chordDisplay';
import { TransposeControls } from '../TransposeControls';
import { getRandomBackground } from '../../utils/backgrounds';
import type { ParsedSong, ParsedLine } from '../../types';

// Hook for dynamic font sizing - finds optimal columns (1-5) + font size combination
function useDynamicFontSize(containerRef: React.RefObject<HTMLDivElement | null>, deps: unknown[]) {
  const calculateOptimalLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const availableHeight = container.clientHeight;
    const availableWidth = container.clientWidth;
    if (availableHeight === 0 || availableWidth === 0) return;
    
    // Get container padding for accurate width calculation
    const containerStyle = getComputedStyle(container);
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(containerStyle.paddingRight) || 0;
    const columnGap = parseFloat(containerStyle.columnGap) || 16;
    
    // Try each column count from 5 down to 1, find best font size for each
    let bestColumns = 1;
    let bestFontSize = 6;
    
    for (let cols = 5; cols >= 1; cols--) {
      container.style.columnCount = String(cols);
      
      // Calculate column width for this configuration
      const totalGaps = (cols - 1) * columnGap;
      const columnWidth = (availableWidth - paddingLeft - paddingRight - totalGaps) / cols;
      
      // Binary search for optimal font size with this column count
      let min = 6;
      let max = 40;
      let optimalForCols = 6;
      
      while (min <= max) {
        const mid = Math.floor((min + max) / 2);
        container.style.setProperty('--dynamic-font-size', `${mid}px`);
        void container.offsetHeight; // Force reflow
        
        // Check vertical fit
        const fitsVertically = container.scrollHeight <= availableHeight + 5;
        
        // Check horizontal fit - measure actual text span widths
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

// Hook for verse-mode font sizing - single column, maximize for readability
// skipWhenTransitioning: when true, skip font calculation (to prevent measuring during animation)
function useVerseFontSize(
  containerRef: React.RefObject<HTMLDivElement | null>, 
  deps: unknown[],
  skipCalculation: boolean = false
) {
  const calculateFontSize = useCallback((): boolean => {
    const container = containerRef.current;
    if (!container) return false;
    
    const availableHeight = container.clientHeight;
    const availableWidth = container.clientWidth;
    if (availableHeight === 0 || availableWidth === 0) return false;
    
    // Check if there's actual content to measure - look for text spans
    const textSpans = container.querySelectorAll('.lyric, .cue');
    if (textSpans.length === 0) return false; // No content yet, need retry
    
    // Single column for verse mode
    container.style.columnCount = '1';
    
    // Calculate available width for text (account for padding)
    const containerStyle = getComputedStyle(container);
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(containerStyle.paddingRight) || 0;
    const maxTextWidth = availableWidth - paddingLeft - paddingRight;
    
    // Binary search for optimal font size
    let min = 12;
    let max = 80; // Larger max for verse mode
    let optimalSize = 12;
    
    while (min <= max) {
      const mid = Math.floor((min + max) / 2);
      container.style.setProperty('--dynamic-font-size', `${mid}px`);
      void container.offsetHeight; // Force reflow
      
      // Check vertical fit
      const fitsVertically = container.scrollHeight <= availableHeight + 5;
      
      // Check horizontal fit - measure actual text span widths
      let fitsHorizontally = true;
      for (const span of textSpans) {
        // Use getBoundingClientRect for accurate text width measurement
        const spanWidth = span.getBoundingClientRect().width;
        if (spanWidth > maxTextWidth) {
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
    return true; // Success
  }, [containerRef]);
  
  useEffect(() => {
    // Skip calculation during transitions to prevent measuring both verses
    if (skipCalculation) return;
    
    let retryCount = 0;
    const maxRetries = 10;
    
    const attemptCalculation = () => {
      const success = calculateFontSize();
      if (!success && retryCount < maxRetries) {
        retryCount++;
        // Retry with increasing delay (50, 100, 150, 200...)
        setTimeout(attemptCalculation, 50 * retryCount);
      }
    };
    
    // Initial attempt after short delay for DOM to settle
    const timeoutId = setTimeout(attemptCalculation, 50);
    
    const handleResize = () => {
      requestAnimationFrame(() => calculateFontSize());
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateFontSize, skipCalculation, ...deps]);
}

// Line with its original index for proper verse highlighting
interface IndexedLine {
  line: ParsedLine;
  originalIndex: number;
}

// Group lines into sections for full-song display, tracking original indices
function groupIntoSections(lines: ParsedLine[], showChords: boolean): IndexedLine[][] {
  const sections: IndexedLine[][] = [];
  let currentSection: IndexedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
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

    currentSection.push({ line, originalIndex: i });
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
  keyOffset?: number;
  onClick?: (lineIndex: number) => void;
  isHighlighted?: boolean;
}

function LineDisplay({ line, showChords, lineIndex, keyOffset = 0, onClick, isHighlighted }: LineDisplayProps) {
  const getText = () => {
    if (!showChords) {
      // In lyrics mode: trim and collapse consecutive spaces to single space
      return line.text.trim().replace(/ {2,}/g, ' ');
    }
    return line.type === 'chords' ? (line.raw || line.text) : line.text;
  };

  // Transpose chord lines
  const getChordText = () => {
    const chordText = line.raw || line.text;
    return formatChordLineForDisplay(transposeChordLine(chordText, keyOffset));
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
        <span className="chords">{getChordText()}</span>
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
    effectiveKeyOffset,
    viewerKeyOverride: _viewerKeyOverride,
    setViewerKeyOverride,
    isKeyOutOfSync,
    nextVerse, 
    prevVerse, 
    setVerse,
    setKeyOffset,
    syncKeyToAll,
    setDisplayMode,
    toggleVersesEnabled,
  } = usePlayingNow();
  const { isAdmin } = useAuth();
  const [lyrics, setLyrics] = useState<ParsedSong | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [outgoingLines, setOutgoingLines] = useState<ParsedLine[]>([]);
  const [transitionDirection, setTransitionDirection] = useState<'up' | 'down'>('up');
  const [currentBackground, setCurrentBackground] = useState(() => getRandomBackground());
  const adminContainerRef = useRef<HTMLDivElement>(null);
  const viewerFullContainerRef = useRef<HTMLDivElement>(null);
  const viewerVerseContainerRef = useRef<HTMLDivElement>(null);

  // Fetch lyrics when song changes
  useEffect(() => {
    if (state.currentSongId) {
      setIsLoading(true);
      songsApi.getLyrics(state.currentSongId)
        .then(setLyrics)
        .catch(console.error)
        .finally(() => setIsLoading(false));
      // Pick a new random background for the new song (avoid repeating the current one)
      setCurrentBackground(prev => getRandomBackground(prev));
    } else {
      setLyrics(null);
    }
  }, [state.currentSongId]);

  // Calculate verses
  // Use lyrics-mode verse calculation when displayMode is 'lyrics' for consistent behavior
  // between admin highlight and viewer verse display
  const linesPerVerse = state.projectorLinesPerVerse ?? DEFAULT_LINES_PER_VERSE;
  const verses = useMemo(() => {
    if (!lyrics) return [];
    // Use lyrics-mode calculation for lyrics display mode (handles consecutive empties,
    // no verse starting with empty, merges undersized last verse)
    if (state.displayMode === 'lyrics') {
      return calculateVersesForLyricsMode(lyrics.lines, linesPerVerse);
    }
    // Use original calculation for chords mode
    return calculateVerses(lyrics.lines, linesPerVerse);
  }, [lyrics, linesPerVerse, state.displayMode]);

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

  // Get current verse lines for display
  const currentVerseLines = useMemo(() => {
    if (!lyrics || verses.length === 0) return [];
    return getVerseLinesForDisplay(lyrics.lines, verses, currentVerseIndex, linesPerVerse);
  }, [lyrics, verses, currentVerseIndex, linesPerVerse]);

  // Verse font sizing for viewer single-verse mode
  // Skip calculation during transition to prevent measuring both outgoing and incoming verses
  // Include currentVerseLines.length to trigger recalc when content first loads
  useVerseFontSize(viewerVerseContainerRef, [currentVerse, viewerShowsSingleVerse, isTransitioning, currentVerseLines.length], isTransitioning);

  // State for partial scroll (when transitioning to/from padded last verse)
  const [isPartialScroll, setIsPartialScroll] = useState(false);
  const [mergedScrollLines, setMergedScrollLines] = useState<ParsedLine[]>([]);
  const [scrollPercentage, setScrollPercentage] = useState(0);

  // Handle verse transition animation
  const prevVerseIndexRef = useRef(state.currentVerseIndex);
  useEffect(() => {
    if (prevVerseIndexRef.current !== state.currentVerseIndex && lyrics && verses.length > 0) {
      const fromIndex = prevVerseIndexRef.current;
      const toIndex = state.currentVerseIndex;
      const goingForward = toIndex > fromIndex;
      
      // Capture the outgoing content before it changes
      const outgoing = getVerseLinesForDisplay(lyrics.lines, verses, fromIndex, linesPerVerse);
      const incoming = getVerseLinesForDisplay(lyrics.lines, verses, toIndex, linesPerVerse);
      
      // Check if this involves the last verse with padding
      const lastVerseIndex = verses.length - 1;
      const lastVerse = verses[lastVerseIndex];
      const lastVerseIsPadded = lastVerse && lastVerse.visibleLineCount < linesPerVerse;
      const involvesLastVerse = fromIndex === lastVerseIndex || toIndex === lastVerseIndex;
      
      if (involvesLastVerse && lastVerseIsPadded) {
        // Partial scroll: create merged content
        const actualLastVerseLines = lastVerse.visibleLineCount;
        const paddingLines = linesPerVerse - actualLastVerseLines;
        
        if (goingForward && toIndex === lastVerseIndex) {
          // Going TO the last verse
          // Outgoing: full verse, Incoming: padded (paddingLines from prev + actualLastVerseLines)
          // Merged: unique_outgoing + common + unique_incoming
          const uniqueOutgoing = outgoing.slice(0, actualLastVerseLines); // First N lines leave
          const common = outgoing.slice(actualLastVerseLines); // Last (padding) lines stay
          const uniqueIncoming = incoming.slice(paddingLines); // New lines enter
          
          const merged = [...uniqueOutgoing, ...common, ...uniqueIncoming];
          setMergedScrollLines(merged);
          // Scroll from showing first 8 to showing last 8
          // That's scrolling by actualLastVerseLines out of merged.length
          setScrollPercentage((actualLastVerseLines / merged.length) * 100);
          setIsPartialScroll(true);
        } else if (!goingForward && fromIndex === lastVerseIndex) {
          // Going FROM the last verse (backward)
          // Outgoing: padded, Incoming: full verse
          const uniqueIncoming = incoming.slice(0, actualLastVerseLines); // New lines enter from top
          const common = incoming.slice(actualLastVerseLines); // These stay
          const uniqueOutgoing = outgoing.slice(paddingLines); // These leave at bottom
          
          const merged = [...uniqueIncoming, ...common, ...uniqueOutgoing];
          setMergedScrollLines(merged);
          // Scroll from showing last 8 to showing first 8
          setScrollPercentage((actualLastVerseLines / merged.length) * 100);
          setIsPartialScroll(true);
        } else {
          // Normal full scroll
          setOutgoingLines(outgoing);
          setIsPartialScroll(false);
        }
      } else {
        // Normal full scroll
        setOutgoingLines(outgoing);
        setIsPartialScroll(false);
      }
      
      setTransitionDirection(goingForward ? 'up' : 'down');
      setIsTransitioning(true);
      
      // End transition after animation completes
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setOutgoingLines([]);
        setMergedScrollLines([]);
        setIsPartialScroll(false);
      }, 1000);
      
      prevVerseIndexRef.current = state.currentVerseIndex;
      return () => clearTimeout(timer);
    }
    prevVerseIndexRef.current = state.currentVerseIndex;
  }, [state.currentVerseIndex, lyrics, verses, linesPerVerse]);

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
            {/* Transpose controls - always visible for admin */}
            <TransposeControls
              currentOffset={state.currentKeyOffset}
              adminOffset={state.currentKeyOffset}
              isAdmin={true}
              onOffsetChange={setKeyOffset}
              onSync={syncKeyToAll}
            />
          </div>
        )}

        {/* Viewer controls - verse toggle and transpose */}
        {!isAdmin && (
          <div className="viewer-controls">
            {/* Verse toggle - only when admin has verses enabled and in lyrics mode */}
            {state.versesEnabled && state.displayMode === 'lyrics' && (
              <button
                onClick={() => setViewerVerseOverride(viewerVerseOverride === false ? null : false)}
                title={viewerVerseOverride === false ? "הפעל מצב פסוקים" : "הצג שיר מלא"}
                className={viewerVerseOverride === false ? '' : 'active'}
              >
                {viewerVerseOverride === false ? '📄' : '📖'}
              </button>
            )}
            {/* Transpose controls - only in chords mode */}
            {state.displayMode === 'chords' && (
              <TransposeControls
                currentOffset={effectiveKeyOffset}
                adminOffset={state.currentKeyOffset}
                isAdmin={false}
                isOutOfSync={isKeyOutOfSync}
                onOffsetChange={(offset) => setViewerKeyOverride(offset)}
              />
            )}
          </div>
        )}

        {/* Song title inline */}
        <div className="song-title-compact">
          {lyrics.metadata.title}
          <span className="artist"> - {lyrics.metadata.artist}</span>
          {state.song && (state.song.composers?.length || state.song.lyricists?.length || state.song.translators?.length) && (
            <span className="credits-compact">
              {' | '}{formatCredits(state.song, isRtl)}
            </span>
          )}
        </div>
      </div>

      {/* === ADMIN VIEW: Always shows chords with multi-column layout === */}
      {isAdmin && (
        <div 
          ref={adminContainerRef}
          className={`lyrics-container chords ${showPurpleHighlight ? 'with-verse-highlight' : ''}`}
        >
          {adminSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="lyrics-section">
              {section.map((indexedLine) => {
                const isHighlighted = showPurpleHighlight && isLineInCurrentVerse(indexedLine.originalIndex);
                return (
                  <LineDisplay 
                    key={indexedLine.originalIndex}
                    line={indexedLine.line} 
                    showChords={true}
                    lineIndex={indexedLine.originalIndex}
                    keyOffset={state.currentKeyOffset}
                    onClick={showPurpleHighlight ? handleLineClick : undefined}
                    isHighlighted={isHighlighted}
                  />
                );
              })}
            </div>
          ))}
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
                  {section.map((indexedLine) => (
                    <LineDisplay 
                      key={indexedLine.originalIndex}
                      line={indexedLine.line} 
                      showChords={true}
                      lineIndex={indexedLine.originalIndex}
                      keyOffset={effectiveKeyOffset}
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
              style={{ '--viewer-bg': `url('${currentBackground}')` } as React.CSSProperties}
            >
              {viewerLyricsSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="lyrics-section">
                  {section.map((indexedLine) => (
                    <LineDisplay 
                      key={indexedLine.originalIndex}
                      line={indexedLine.line} 
                      showChords={false}
                      lineIndex={indexedLine.originalIndex}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Mode 3: Lyrics, verses on - single verse, centered */}
          {/* For undersized last verse, getVerseLinesForDisplay pads with lines from previous verse */}
          {viewerShowsSingleVerse && (
            <div 
              ref={viewerVerseContainerRef}
              className="lyrics-container lyrics verse-single"
              style={{ '--viewer-bg': `url('${currentBackground}')` } as React.CSSProperties}
            >
              {isTransitioning ? (
                isPartialScroll ? (
                  // Partial scroll for padded last verse: single merged content that scrolls partially
                  <div 
                    className={`verse-partial-scroll partial-${transitionDirection}`}
                    style={{ '--scroll-percent': `${scrollPercentage}%` } as React.CSSProperties}
                  >
                    {mergedScrollLines.map((line, lineIndex) => (
                      <LineDisplay 
                        key={`merged-${lineIndex}`}
                        line={line} 
                        showChords={false}
                        lineIndex={lineIndex}
                      />
                    ))}
                  </div>
                ) : (
                  // Full scroll: both verses absolutely positioned, CSS handles animation
                  <div className={`verse-transition-wrapper transition-${transitionDirection}`}>
                    <div className="verse-content outgoing">
                      {outgoingLines.map((line, lineIndex) => (
                        <LineDisplay 
                          key={`out-${lineIndex}`}
                          line={line} 
                          showChords={false}
                          lineIndex={lineIndex}
                        />
                      ))}
                    </div>
                    <div className="verse-content incoming">
                      {currentVerseLines.map((line, lineIndex) => (
                        <LineDisplay 
                          key={`in-${lineIndex}`}
                          line={line} 
                          showChords={false}
                          lineIndex={lineIndex}
                        />
                      ))}
                    </div>
                  </div>
                )
              ) : (
                // Normal display: just current verse
                currentVerseLines.map((line, lineIndex) => (
                  <LineDisplay 
                    key={lineIndex}
                    line={line} 
                    showChords={false}
                    lineIndex={lineIndex}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import { songsApi } from '../../services/api';
import { calculateVerses, calculateVersesForLyricsMode, getVerseLinesForDisplay, findVerseForLine, DEFAULT_LINES_PER_VERSE } from '../../utils/verseCalculator';
import { formatCredits } from '../../utils/formatCredits';
import { transposeChordLine } from '../../services/transpose';
import { formatChordLineForDisplay, segmentChordLine } from '../../services/chordDisplay';
import { TransposeControls } from '../TransposeControls';
import { getSongBackground } from '../../utils/backgrounds';
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
    
    // Try each column count from 8 down to 1, find best font size for each
    // More columns = narrower columns but potentially larger font if content fits
    let bestColumns = 1;
    let bestFontSize = 6;
    
    for (let cols = 8; cols >= 1; cols--) {
      container.style.columnCount = String(cols);
      
      // Calculate column width for this configuration
      const totalGaps = (cols - 1) * columnGap;
      const columnWidth = (availableWidth - paddingLeft - paddingRight - totalGaps) / cols;
      
      // Binary search for optimal font size with this column count
      let min = 6;
      let max = 60;
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
    // Initial calculation after delay for DOM to settle
    const timeoutId = setTimeout(calculateOptimalLayout, 150);
    
    // Second calculation after longer delay to catch mode switches
    const secondTimeoutId = setTimeout(calculateOptimalLayout, 400);
    
    const handleResize = () => {
      requestAnimationFrame(calculateOptimalLayout);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(secondTimeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateOptimalLayout, ...deps]);
}

// Hook for verse-mode font sizing - single column, maximize for readability
// isTransitioning: when true, measure incoming verse content and animate font size change
// isPartialScroll: when true, skip animation (DOM content during partial scroll is merged, not final)
// songId: used to detect song changes and reset font size
// isLoading: when true, skip font calculations (content is stale)
function useVerseFontSize(
  containerRef: React.RefObject<HTMLDivElement | null>, 
  deps: unknown[],
  isTransitioning: boolean = false,
  isPartialScroll: boolean = false,
  songId: number | null = null,
  isLoading: boolean = false
) {
  // Track current font size to enable smooth transitions
  const currentFontSizeRef = useRef<number>(40);
  const prevTransitioningRef = useRef(isTransitioning);
  const prevSongIdRef = useRef(songId);
  // Hidden measurement container - created once and reused
  const measureContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Reset font size when song changes
  useEffect(() => {
    if (songId !== prevSongIdRef.current) {
      // Song changed - reset to default size immediately
      const container = containerRef.current;
      if (container) {
        container.classList.add('measuring'); // Disable transition
        container.style.setProperty('--dynamic-font-size', '40px');
        container.classList.remove('measuring');
      }
      currentFontSizeRef.current = 40;
      prevSongIdRef.current = songId;
    }
  }, [songId, containerRef]);
  
  // Get or create hidden measurement container
  const getMeasureContainer = useCallback((container: HTMLDivElement): HTMLDivElement => {
    const containerStyle = getComputedStyle(container);
    
    if (!measureContainerRef.current) {
      const measureDiv = document.createElement('div');
      document.body.appendChild(measureDiv);
      measureContainerRef.current = measureDiv;
    }
    
    const measureDiv = measureContainerRef.current;
    // Copy all relevant styles from the real container
    measureDiv.className = container.className + ' measuring';
    measureDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      pointer-events: none;
      left: -9999px;
      top: 0;
      width: ${container.clientWidth}px;
      height: ${container.clientHeight}px;
      overflow: auto;
      font-family: ${containerStyle.fontFamily};
      padding: ${containerStyle.padding};
      line-height: ${containerStyle.lineHeight};
      column-count: 1;
    `;
    
    // Add a style element for line-specific styles
    let styleEl = measureDiv.querySelector('style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      measureDiv.appendChild(styleEl);
    }
    // Lines must not wrap for horizontal overflow detection
    styleEl.textContent = `.line { white-space: nowrap; }`;
    
    return measureDiv;
  }, []);

  // Cleanup measurement container on unmount
  useEffect(() => {
    return () => {
      if (measureContainerRef.current) {
        document.body.removeChild(measureContainerRef.current);
        measureContainerRef.current = null;
      }
    };
  }, []);

  // Calculate optimal font size using hidden measurement container
  const calculateOptimalSize = useCallback((content: Element, container: HTMLDivElement): number => {
    const measureContainer = getMeasureContainer(container);
    
    // Copy content to measurement container (preserve the style element we added)
    const styleEl = measureContainer.querySelector('style');
    measureContainer.innerHTML = content.innerHTML;
    if (styleEl) measureContainer.appendChild(styleEl);
    
    const availableHeight = container.clientHeight;
    const availableWidth = container.clientWidth;
    
    // Binary search for optimal font size
    let min = 16;
    let max = 80;
    let optimalSize = 40; // Start with reasonable default
    
    while (min <= max) {
      const mid = Math.floor((min + max) / 2);
      measureContainer.style.setProperty('--dynamic-font-size', `${mid}px`);
      void measureContainer.offsetHeight; // Force reflow
      
      // With overflow: auto, scrollWidth/scrollHeight accurately reflect content size
      const fitsVertically = measureContainer.scrollHeight <= availableHeight + 2;
      const fitsHorizontally = measureContainer.scrollWidth <= availableWidth + 2;
      
      if (fitsVertically && fitsHorizontally) {
        optimalSize = mid;
        min = mid + 1;
      } else {
        max = mid - 1;
      }
    }
    
    // Ensure we never return a tiny font (minimum 20px for readability)
    return Math.max(optimalSize, 20);
  }, [getMeasureContainer]);

  const calculateFontSize = useCallback((measureIncoming: boolean = false): boolean => {
    const container = containerRef.current;
    if (!container) return false;
    
    // Require minimum dimensions for accurate measurement
    if (container.clientHeight < 100 || container.clientWidth < 100) return false;
    
    container.style.columnCount = '1';
    
    // Determine what content to measure
    let contentToMeasure: Element | null = null;
    if (measureIncoming) {
      contentToMeasure = container.querySelector('.verse-content.incoming');
    }
    if (!contentToMeasure) {
      contentToMeasure = container;
    }
    
    // Check if there's content to measure - look for .line elements
    const lineElements = contentToMeasure.querySelectorAll('.line');
    if (lineElements.length === 0) return false; // No content yet
    
    // Also verify there's actual text content
    const textSpans = contentToMeasure.querySelectorAll('.lyric, .cue');
    if (textSpans.length === 0) return false;
    
    // Calculate optimal size using hidden container (doesn't affect visible display)
    const optimalSize = calculateOptimalSize(contentToMeasure, container);
    
    // If this is for a transition, animate from current to optimal
    if (measureIncoming && optimalSize !== currentFontSizeRef.current) {
      // Set the target size - CSS transition will animate from current to target
      container.style.setProperty('--dynamic-font-size', `${optimalSize}px`);
      currentFontSizeRef.current = optimalSize;
    } else if (!measureIncoming) {
      // Direct set (no animation needed)
      container.classList.add('measuring'); // Disable transition
      container.style.setProperty('--dynamic-font-size', `${optimalSize}px`);
      container.classList.remove('measuring');
      currentFontSizeRef.current = optimalSize;
    }
    
    return true;
  }, [containerRef, calculateOptimalSize]);
  
  useEffect(() => {
    // Skip all calculations while loading - content is stale/changing
    if (isLoading) return;
    
    const wasTransitioning = prevTransitioningRef.current;
    prevTransitioningRef.current = isTransitioning;
    
    let retryCount = 0;
    const maxRetries = 15; // More retries for initial load
    let timeoutIds: ReturnType<typeof setTimeout>[] = [];
    
    const attemptCalculation = (measureIncoming: boolean) => {
      const success = calculateFontSize(measureIncoming);
      if (!success && retryCount < maxRetries) {
        retryCount++;
        // Exponential backoff: 50ms, 100ms, 150ms, 200ms...
        const delay = 50 * retryCount;
        const id = setTimeout(() => attemptCalculation(measureIncoming), delay);
        timeoutIds.push(id);
      }
    };
    
    if (isTransitioning && !wasTransitioning) {
      // Transition just STARTED
      // Skip animated font change for partial scroll (DOM content is merged, not representative of final verse)
      if (!isPartialScroll) {
        const id = setTimeout(() => {
          calculateFontSize(true);
        }, 50);
        timeoutIds.push(id);
      }
    } else if (!isTransitioning && wasTransitioning) {
      // Transition just ENDED - ensure final size is accurate
      requestAnimationFrame(() => {
        calculateFontSize(false);
      });
    } else if (!isTransitioning) {
      // Normal state - initial load or content change
      // attemptCalculation has built-in retry with exponential backoff
      const initialId = setTimeout(() => attemptCalculation(false), 50);
      timeoutIds.push(initialId);
    }
    
    const handleResize = () => {
      if (!isTransitioning && !isLoading) {
        requestAnimationFrame(() => calculateFontSize(false));
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateFontSize, isTransitioning, isPartialScroll, isLoading, ...deps]);
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

  // Transpose chord lines and get segmented content (chords + inline directives)
  const getChordSegments = () => {
    const chordText = line.raw || line.text;
    const transposedAndFormatted = formatChordLineForDisplay(transposeChordLine(chordText, keyOffset));
    return segmentChordLine(transposedAndFormatted);
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
}

export function PlayingNowView() {
  const { 
    state, 
    effectiveVersesEnabled,
    effectiveDisplayMode,
    viewerModeLocked,
    viewerDisplayMode,
    viewerVersesEnabled,
    toggleViewerLock,
    setViewerDisplayMode,
    setViewerVersesEnabled,
    effectiveKeyOffset,
    setViewerKeyOverride,
    isKeyOutOfSync,
    setMaxVerseIndex,
    nextVerse, 
    prevVerse, 
    setVerse,
    setKeyOffset,
    syncKeyToAll,
    setDisplayMode,
    toggleVersesEnabled,
  } = usePlayingNow();
  const { isRoomOwner } = useAuth();
  const { room } = useRoom();
  const [lyrics, setLyrics] = useState<ParsedSong | null>(null);
  const [lyricsSongId, setLyricsSongId] = useState<number | null>(null); // Track which song the lyrics belong to
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [outgoingLines, setOutgoingLines] = useState<ParsedLine[]>([]);
  const [transitionDirection, setTransitionDirection] = useState<'up' | 'down'>('up');
  const [scrollPercent, setScrollPercent] = useState(100); // Percentage to scroll (100% = full, less = overlap visible)
  const [currentBackground, setCurrentBackground] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const adminContainerRef = useRef<HTMLDivElement>(null);
  const viewerFullContainerRef = useRef<HTMLDivElement>(null);
  const viewerVerseContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen mode
  const enterFullscreen = useCallback(() => {
    const container = fullscreenContainerRef.current;
    if (container && container.requestFullscreen) {
      container.requestFullscreen().catch(console.error);
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

  // Track previous song ID to detect song changes synchronously (before effects run)
  const prevSongIdForLyricsRef = useRef(state.currentSongId);
  
  // Clear lyrics synchronously when song changes (before render)
  // This prevents any flash of old content
  if (state.currentSongId !== prevSongIdForLyricsRef.current) {
    prevSongIdForLyricsRef.current = state.currentSongId;
    // These will be applied in the current render cycle
    if (lyrics !== null) {
      setLyrics(null);
      setLyricsSongId(null);
    }
  }
  
  // Fetch lyrics when song changes
  useEffect(() => {
    if (state.currentSongId) {
      setIsLoading(true);
      const songId = state.currentSongId; // Capture for closure
      songsApi.getLyrics(songId)
        .then((loadedLyrics) => {
          // Only set if this is still the current song (prevents race conditions)
          if (songId === prevSongIdForLyricsRef.current) {
            setLyrics(loadedLyrics);
            setLyricsSongId(songId);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
      // Try to load song-specific background, fall back to random pastoral
      getSongBackground(songId).then(setCurrentBackground);
    } else {
      setLyrics(null);
      setLyricsSongId(null);
    }
  }, [state.currentSongId]);
  
  // Check if lyrics are valid for current song
  const lyricsAreValid = lyrics !== null && lyricsSongId === state.currentSongId;

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

  // Update context with max verse index for bounds checking in keyboard shortcuts
  useEffect(() => {
    setMaxVerseIndex(Math.max(0, verses.length - 1));
  }, [verses.length, setMaxVerseIndex]);

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
  const viewerShowsChords = effectiveDisplayMode === 'chords';
  const viewerShowsSingleVerse = !viewerShowsChords && effectiveVersesEnabled;

  // Should admin show purple highlight?
  // Only when: displayMode is 'lyrics' AND versesEnabled is true
  const showPurpleHighlight = state.displayMode === 'lyrics' && state.versesEnabled;

  // Dynamic font sizing for admin view (always multi-column chords)
  useDynamicFontSize(adminContainerRef, [adminSections, showPurpleHighlight, currentVerseIndex]);

  // Dynamic font sizing for viewer full view (chords or full lyrics)
  // Include viewerShowsSingleVerse to trigger recalc when switching from verse to full-lyrics mode
  useDynamicFontSize(viewerFullContainerRef, [
    viewerShowsChords ? adminSections : viewerLyricsSections, 
    viewerShowsChords,
    viewerShowsSingleVerse,
    state.currentSongId
  ]);

  // Get current verse lines for display
  const currentVerseLines = useMemo(() => {
    if (!lyrics || verses.length === 0) return [];
    return getVerseLinesForDisplay(lyrics.lines, verses, currentVerseIndex, linesPerVerse);
  }, [lyrics, verses, currentVerseIndex, linesPerVerse]);

  // Verse font sizing for viewer single-verse mode
  // During transition: measures incoming verse and animates font size alongside slide
  // Pass songId to detect song changes and reset font size
  // Pass isLoading to skip calculations while new lyrics are loading
  useVerseFontSize(
    viewerVerseContainerRef, 
    [state.currentSongId, currentVerse, viewerShowsSingleVerse, isTransitioning, currentVerseLines.length, lyricsAreValid], 
    isTransitioning, 
    false, // isPartialScroll - no longer needed with overlap approach
    state.currentSongId,
    !lyricsAreValid // Skip font calculations when lyrics don't match current song
  );

  // Handle verse transition animation
  // useLayoutEffect ensures isTransitioning is set BEFORE useVerseFontSize runs
  const prevVerseIndexRef = useRef(state.currentVerseIndex);
  useLayoutEffect(() => {
    if (prevVerseIndexRef.current !== state.currentVerseIndex && lyrics && verses.length > 0) {
      const fromIndex = prevVerseIndexRef.current;
      const toIndex = state.currentVerseIndex;
      
      // Check if both indices are valid - don't animate if out of bounds
      const maxVerseIndex = verses.length - 1;
      if (fromIndex < 0 || fromIndex > maxVerseIndex || toIndex < 0 || toIndex > maxVerseIndex) {
        // Invalid index - just update ref, don't animate
        prevVerseIndexRef.current = state.currentVerseIndex;
        return;
      }
      
      // Don't animate if source and destination are the same (clamped to same value)
      if (fromIndex === toIndex) {
        prevVerseIndexRef.current = state.currentVerseIndex;
        return;
      }
      
      const goingForward = toIndex > fromIndex;
      
      // Capture the outgoing and incoming content
      const outgoing = getVerseLinesForDisplay(lyrics.lines, verses, fromIndex, linesPerVerse);
      const incoming = getVerseLinesForDisplay(lyrics.lines, verses, toIndex, linesPerVerse);
      
      // Calculate overlap: how many lines at the end of outgoing match the start of incoming (forward)
      // or how many at the start of outgoing match the end of incoming (backward)
      let overlapCount = 0;
      const minLen = Math.min(outgoing.length, incoming.length);
      
      if (goingForward) {
        // Forward: check if last N lines of outgoing match first N lines of incoming
        for (let i = 1; i <= minLen; i++) {
          let matches = true;
          for (let j = 0; j < i; j++) {
            const outLine = outgoing[outgoing.length - i + j];
            const inLine = incoming[j];
            if (outLine.text !== inLine.text || outLine.type !== inLine.type) {
              matches = false;
              break;
            }
          }
          if (matches) overlapCount = i;
        }
      } else {
        // Backward: check if first N lines of outgoing match last N lines of incoming
        for (let i = 1; i <= minLen; i++) {
          let matches = true;
          for (let j = 0; j < i; j++) {
            const outLine = outgoing[j];
            const inLine = incoming[incoming.length - i + j];
            if (outLine.text !== inLine.text || outLine.type !== inLine.type) {
              matches = false;
              break;
            }
          }
          if (matches) overlapCount = i;
        }
      }
      
      // Calculate scroll percentage: scroll by (N - overlap) / N * 100%
      // This leaves the overlapping lines visible during transition
      const lineCount = outgoing.length;
      const scrollPct = lineCount > 0 ? ((lineCount - overlapCount) / lineCount) * 100 : 100;
      
      setOutgoingLines(outgoing);
      setScrollPercent(scrollPct);
      setTransitionDirection(goingForward ? 'up' : 'down');
      setIsTransitioning(true);
      
      // End transition after animation completes
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setOutgoingLines([]);
      }, 1000);
      
      prevVerseIndexRef.current = state.currentVerseIndex;
      return () => clearTimeout(timer);
    }
    prevVerseIndexRef.current = state.currentVerseIndex;
  }, [state.currentVerseIndex, lyrics, verses, linesPerVerse]);

  // Handle click on line to navigate to verse (room owner only)
  const handleLineClick = useCallback((lineIndex: number) => {
    if (!isRoomOwner || !showPurpleHighlight) return;
    const verseIdx = findVerseForLine(verses, lineIndex);
    if (verseIdx >= 0) {
      setVerse(verseIdx);
    }
  }, [isRoomOwner, showPurpleHighlight, verses, setVerse]);

  // Check if a line should be highlighted in the current verse
  // Only highlight lines that "first appear" in this verse (not overlap lines)
  const isLineInCurrentVerse = useCallback((lineIndex: number): boolean => {
    if (!currentVerse) return false;
    // Use highlightStartIndex to exclude overlap lines from highlighting
    return lineIndex >= currentVerse.highlightStartIndex && lineIndex <= currentVerse.endIndex;
  }, [currentVerse]);

  // No song playing - show splash screen
  if (!state.currentSongId) {
    return (
      <div className="playing-now-splash">
        <div className="splash-content">
          <h1>🎤 {room?.displayName || 'שרים עם אלון'}</h1>
          <p>ממתין לשיר...</p>
          <div className="qr-placeholder">
            <span>QR Code</span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !lyricsAreValid) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>טוען שיר...</p>
      </div>
    );
  }

  // At this point, lyrics is guaranteed to be valid and match the current song
  const isRtl = lyrics!.metadata.direction === 'rtl';
  const isAtFirstVerse = currentVerseIndex === 0;
  const isAtLastVerse = currentVerseIndex >= verses.length - 1;

  return (
    <div className={`playing-now-view ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* Compact top bar with song info and admin controls */}
      <div className="song-top-bar">
        {/* Admin controls inline */}
        {isRoomOwner && (
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

        {/* Viewer controls - 3 buttons matching admin interface */}
        {!isRoomOwner && (
          <div className="viewer-controls">
            {/* Button 1: Display mode toggle - chords/lyrics */}
            {/* When locked: shows and controls viewer's setting */}
            {/* When unlocked: shows admin's setting (read-only) */}
            <button 
              onClick={() => {
                if (viewerModeLocked) {
                  setViewerDisplayMode(viewerDisplayMode === 'lyrics' ? 'chords' : 'lyrics');
                }
              }}
              title={effectiveDisplayMode === 'lyrics' ? "הצג אקורדים" : "הצג מילים"}
              disabled={!viewerModeLocked}
            >
              {effectiveDisplayMode === 'lyrics' ? '🎸' : '🎤'}
            </button>
            {/* Button 2: Verse toggle - on/off */}
            {/* Disabled when: not locked OR in chords mode */}
            <button
              onClick={() => {
                if (viewerModeLocked && effectiveDisplayMode === 'lyrics') {
                  setViewerVersesEnabled(!viewerVersesEnabled);
                }
              }}
              title={effectiveVersesEnabled ? "הצג שיר מלא" : "הפעל מצב פסוקים"}
              className={effectiveVersesEnabled ? 'active' : ''}
              disabled={!viewerModeLocked || effectiveDisplayMode === 'chords'}
            >
              📖
            </button>
            {/* Button 3: Lock button - toggle lock on/off */}
            <button
              onClick={toggleViewerLock}
              title={viewerModeLocked ? "בטל נעילה (עקוב אחרי המנחה)" : "נעל הגדרות (שמור העדפות)"}
              className={`lock-btn ${viewerModeLocked ? 'locked' : ''}`}
            >
              {viewerModeLocked ? '🔒' : '🔓'}
            </button>
            {/* Fullscreen button - only in lyrics mode */}
            {effectiveDisplayMode === 'lyrics' && (
              <button
                onClick={enterFullscreen}
                title="מסך מלא"
                className="fullscreen-btn"
                aria-label="מסך מלא"
              />
            )}
            {/* Transpose controls - only in chords mode */}
            {effectiveDisplayMode === 'chords' && (
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
      {isRoomOwner && (
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
      {!isRoomOwner && (
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

          {/* Fullscreen container for lyrics modes */}
          {!viewerShowsChords && (
            <div 
              ref={fullscreenContainerRef}
              className={`fullscreen-container ${isFullscreen ? 'is-fullscreen' : ''}`}
              style={currentBackground ? { '--viewer-bg': `url('${currentBackground}')` } as React.CSSProperties : undefined}
            >
              {/* Song metadata header - only visible in fullscreen */}
              {isFullscreen && (
                <div className={`fullscreen-song-header ${isRtl ? 'rtl' : 'ltr'}`}>
                  <h1 className="fullscreen-title">{lyrics!.metadata.title}</h1>
                  <div className="fullscreen-artist">{lyrics!.metadata.artist}</div>
                  {state.song && (state.song.composers?.length || state.song.lyricists?.length || state.song.translators?.length) && (
                    <div className="fullscreen-credits">{formatCredits(state.song, isRtl)}</div>
                  )}
                </div>
              )}

              {/* Mode 2: Lyrics, verses off - full lyrics view */}
              {!viewerShowsSingleVerse && (
                <div 
                  ref={viewerFullContainerRef}
                  className="lyrics-container lyrics"
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
                >
                  {isTransitioning ? (
                    // Partial scroll based on overlap: CSS variable controls scroll amount
                    <div 
                      className={`verse-transition-wrapper transition-${transitionDirection}`}
                      style={{ '--scroll-percent': `${scrollPercent}%` } as React.CSSProperties}
                    >
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
            </div>
          )}
        </>
      )}
    </div>
  );
}

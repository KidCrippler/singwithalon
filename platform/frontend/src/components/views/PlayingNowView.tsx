import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';
import { songsApi } from '../../services/api';
import { calculateVerses, calculateVersesForLyricsMode, getVerseLinesForDisplay, findVerseForLine, DEFAULT_LINES_PER_VERSE } from '../../utils/verseCalculator';
import { formatCredits } from '../../utils/formatCredits';
import { groupIntoSectionsWithIndices } from '../../utils/songDisplay';
import { useDynamicFontSize } from '../../hooks/useDynamicFontSize';
import { TransposeControls } from '../TransposeControls';
import { getSongBackground } from '../../utils/backgrounds';
import { getRoomSplash } from '../../utils/splash';
import { requestFullscreen, exitFullscreen as exitFullscreenUtil, addFullscreenChangeListener, isInFullscreen } from '../../utils/fullscreen';
import { FullscreenExitButton } from '../common/FullscreenExitButton';
import { ChordsFullscreenHeader } from '../common/ChordsFullscreenHeader';
import { LineDisplay } from '../common/LineDisplay';
import type { ParsedSong, ParsedLine } from '../../types';

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
  // CRITICAL: Append to container.parentElement (not document.body) to preserve CSS context
  const getMeasureContainer = useCallback((container: HTMLDivElement): HTMLDivElement | null => {
    const containerStyle = getComputedStyle(container);
    const parent = container.parentElement;
    if (!parent) return null;
    
    // Remove old container if it exists in wrong parent
    if (measureContainerRef.current && measureContainerRef.current.parentElement !== parent) {
      measureContainerRef.current.remove();
      measureContainerRef.current = null;
    }
    
    if (!measureContainerRef.current) {
      const measureDiv = document.createElement('div');
      parent.appendChild(measureDiv);
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
      overflow: visible;
      font-family: ${containerStyle.fontFamily};
      padding: ${containerStyle.padding};
      line-height: ${containerStyle.lineHeight};
      column-count: 1;
    `;
    
    return measureDiv;
  }, []);

  // Cleanup measurement container on unmount
  useEffect(() => {
    return () => {
      if (measureContainerRef.current) {
        measureContainerRef.current.remove();
        measureContainerRef.current = null;
      }
    };
  }, []);

  // Calculate optimal font size using hidden measurement container
  const calculateOptimalSize = useCallback((content: Element, container: HTMLDivElement): number => {
    const measureContainer = getMeasureContainer(container);
    if (!measureContainer) return 40; // Fallback if no parent
    
    // Copy content to measurement container
    measureContainer.innerHTML = content.innerHTML;
    
    // Apply nowrap to lines for horizontal overflow detection
    // (Using inline styles to avoid polluting global CSS)
    const lines = measureContainer.querySelectorAll('.line');
    lines.forEach(line => {
      (line as HTMLElement).style.whiteSpace = 'nowrap';
    });
    
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
      
      // Check vertical fit using scrollHeight
      const fitsVertically = measureContainer.scrollHeight <= availableHeight + 2;
      
      // Check horizontal fit using getBoundingClientRect on text spans
      // This is more reliable than scrollWidth for inline elements
      let fitsHorizontally = true;
      const textSpans = measureContainer.querySelectorAll('.lyric, .cue, .chords');
      for (const span of textSpans) {
        const spanWidth = span.getBoundingClientRect().width;
        if (spanWidth > availableWidth) {
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
  const [splashUrl, setSplashUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenRecalcTrigger, setFullscreenRecalcTrigger] = useState(0); // Incremented to force recalc after fullscreen re-entry
  const shouldReenterFullscreenRef = useRef(false); // Track if we need to re-enter fullscreen after song change
  const adminContainerRef = useRef<HTMLDivElement>(null);
  const viewerChordsContainerRef = useRef<HTMLDivElement>(null);
  const viewerLyricsContainerRef = useRef<HTMLDivElement>(null);
  const viewerVerseContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const adminFullscreenContainerRef = useRef<HTMLDivElement>(null);
  const viewerChordsFullscreenContainerRef = useRef<HTMLDivElement>(null);
  const splashFullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen mode for splash screen
  const enterSplashFullscreen = useCallback(() => {
    requestFullscreen(splashFullscreenContainerRef.current);
  }, []);

  // Handle fullscreen mode - select appropriate container based on current mode
  // Uses cross-browser utility for webkit/moz/ms vendor prefix support (older tablets)
  const enterFullscreen = useCallback(() => {
    let container: HTMLDivElement | null = null;
    
    if (isRoomOwner) {
      // Admin always sees chords
      container = adminFullscreenContainerRef.current;
    } else if (effectiveDisplayMode === 'chords') {
      // Viewer in chords mode
      container = viewerChordsFullscreenContainerRef.current;
    } else {
      // Viewer in lyrics mode (with or without verses)
      container = fullscreenContainerRef.current;
    }
    
    requestFullscreen(container);
  }, [isRoomOwner, effectiveDisplayMode]);

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
    // If we're currently in fullscreen, remember to re-enter after new song loads
    if (isInFullscreen()) {
      shouldReenterFullscreenRef.current = true;
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

  // Load splash screen for room when no song is playing
  useEffect(() => {
    if (!state.currentSongId && room?.adminId) {
      getRoomSplash(room.adminId).then(setSplashUrl);
    }
  }, [state.currentSongId, room?.adminId]);
  
  // Check if lyrics are valid for current song
  const lyricsAreValid = lyrics !== null && lyricsSongId === state.currentSongId;

  // Re-enter fullscreen after song change (if we were in fullscreen before)
  useEffect(() => {
    if (shouldReenterFullscreenRef.current && lyricsAreValid && !isLoading) {
      // Give DOM a moment to render new content before re-entering fullscreen
      const timer = setTimeout(async () => {
        if (shouldReenterFullscreenRef.current) {
          await enterFullscreen();
          shouldReenterFullscreenRef.current = false;
          // Force font recalculation after fullscreen is re-entered
          // (incrementing this state triggers deps in font sizing hooks)
          setTimeout(() => {
            setFullscreenRecalcTrigger(prev => prev + 1);
          }, 150); // Small delay to ensure fullscreen transition completes
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [lyricsAreValid, isLoading, enterFullscreen]);

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
    return groupIntoSectionsWithIndices(lyrics.lines, true); // Always show chords for admin
  }, [lyrics]);

  const viewerLyricsSections = useMemo(() => {
    if (!lyrics) return [];
    return groupIntoSectionsWithIndices(lyrics.lines, false); // No chords for viewer lyrics mode
  }, [lyrics]);

  // Determine viewer mode
  const viewerShowsChords = effectiveDisplayMode === 'chords';
  const viewerShowsSingleVerse = !viewerShowsChords && effectiveVersesEnabled;

  // Should admin show purple highlight?
  // Only when: displayMode is 'lyrics' AND versesEnabled is true
  const showPurpleHighlight = state.displayMode === 'lyrics' && state.versesEnabled;

  // Dynamic font sizing for admin view (always multi-column chords)
  // Include isFullscreen and fullscreenRecalcTrigger to recalculate when entering/exiting fullscreen
  useDynamicFontSize(adminContainerRef, [adminSections, showPurpleHighlight, currentVerseIndex, isFullscreen, fullscreenRecalcTrigger]);

  // Dynamic font sizing for viewer chords view
  // Include isFullscreen and fullscreenRecalcTrigger to recalculate when entering/exiting fullscreen
  useDynamicFontSize(viewerChordsContainerRef, [
    adminSections, 
    viewerShowsChords,
    state.currentSongId,
    isFullscreen,
    fullscreenRecalcTrigger,
  ]);

  // Dynamic font sizing for viewer lyrics full view
  // Include viewerShowsSingleVerse to trigger recalc when switching from verse to full-lyrics mode
  // Include isFullscreen and fullscreenRecalcTrigger to recalculate when entering/exiting fullscreen
  useDynamicFontSize(viewerLyricsContainerRef, [
    viewerLyricsSections, 
    !viewerShowsChords && !viewerShowsSingleVerse,
    viewerShowsSingleVerse,
    state.currentSongId,
    isFullscreen,
    fullscreenRecalcTrigger,
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
  // Include isFullscreen and fullscreenRecalcTrigger to recalculate when entering/exiting fullscreen
  useVerseFontSize(
    viewerVerseContainerRef, 
    [state.currentSongId, currentVerse, viewerShowsSingleVerse, isTransitioning, currentVerseLines.length, lyricsAreValid, isFullscreen, fullscreenRecalcTrigger], 
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
      <div className="playing-now-splash" ref={splashFullscreenContainerRef}>
        {splashUrl ? (
          <img 
            src={splashUrl} 
            alt={room?.displayName || 'ממתין לשיר'} 
            className="splash-image"
          />
        ) : (
          <div className="splash-fallback">
            <div className="splash-icon">🎤</div>
            <h1>{room?.displayName || 'שרים ביחד'}</h1>
            <p>ממתין לשיר...</p>
          </div>
        )}
        
        {/* Fullscreen button */}
        {!isFullscreen && (
          <button
            onClick={enterSplashFullscreen}
            className="splash-fullscreen-btn"
            title="מסך מלא"
            aria-label="מסך מלא"
          >
            ⛶
          </button>
        )}
        
        {/* Exit fullscreen button */}
        {isFullscreen && (
          <FullscreenExitButton onExit={exitFullscreen} variant="light" />
        )}
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
            {/* Fullscreen button for admin */}
            <button
              onClick={enterFullscreen}
              title="מסך מלא"
              className="fullscreen-btn"
              aria-label="מסך מלא"
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
            {/* Fullscreen button - available in all modes */}
            <button
              onClick={enterFullscreen}
              title="מסך מלא"
              className="fullscreen-btn"
              aria-label="מסך מלא"
            />
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
          ref={adminFullscreenContainerRef}
          className={`chords-fullscreen-container ${isFullscreen ? 'is-fullscreen' : ''}`}
        >
          {/* Exit button - only visible in fullscreen */}
          {isFullscreen && (
            <FullscreenExitButton onExit={exitFullscreen} variant="dark" />
          )}
          
          {/* Compact header - only visible in fullscreen */}
          {isFullscreen && lyrics && (
            <ChordsFullscreenHeader
              title={lyrics.metadata.title}
              artist={lyrics.metadata.artist}
              song={state.song}
              isRtl={isRtl}
            />
          )}
          
          {/* Admin controls overlay - visible in fullscreen, more subtle */}
          {isFullscreen && (
            <div className="admin-controls-fullscreen">
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
              {state.versesEnabled && verses.length > 0 && (
                <span className="verse-indicator">
                  {currentVerseIndex + 1}/{verses.length}
                </span>
              )}
              <TransposeControls
                currentOffset={state.currentKeyOffset}
                adminOffset={state.currentKeyOffset}
                isAdmin={true}
                onOffsetChange={setKeyOffset}
                onSync={syncKeyToAll}
              />
              <button
                onClick={exitFullscreen}
                title="יציאה ממסך מלא"
                className="exit-fullscreen-btn"
              >
                ⤡
              </button>
            </div>
          )}

          <div 
            ref={adminContainerRef}
            className={`lyrics-container chords ${showPurpleHighlight ? 'with-verse-highlight' : ''} ${isFullscreen ? 'in-fullscreen' : ''}`}
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
        </div>
      )}

      {/* === VIEWER VIEW: 3 modes === */}
      {!isRoomOwner && (
        <>
          {/* Mode 1: Chords enabled - same as admin, multi-column, no highlight */}
          {viewerShowsChords && (
            <div 
              ref={viewerChordsFullscreenContainerRef}
              className={`chords-fullscreen-container ${isFullscreen ? 'is-fullscreen' : ''}`}
            >
              {/* Exit button - only visible in fullscreen */}
              {isFullscreen && (
                <FullscreenExitButton onExit={exitFullscreen} variant="dark" />
              )}
              
              {/* Compact header - only visible in fullscreen */}
              {isFullscreen && lyrics && (
                <ChordsFullscreenHeader
                  title={lyrics.metadata.title}
                  artist={lyrics.metadata.artist}
                  song={state.song}
                  isRtl={isRtl}
                />
              )}

              <div 
                key={`chords-inner-${state.currentSongId}`}
                ref={viewerChordsContainerRef}
                className={`lyrics-container chords ${isFullscreen ? 'in-fullscreen' : ''}`}
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
            </div>
          )}

          {/* Fullscreen container for lyrics modes */}
          {!viewerShowsChords && (
            <div 
              ref={fullscreenContainerRef}
              className={`fullscreen-container ${isFullscreen ? 'is-fullscreen' : ''}`}
              style={currentBackground ? { '--viewer-bg': `url('${currentBackground}')` } as React.CSSProperties : undefined}
            >
              {/* Exit button - only visible in fullscreen */}
              {isFullscreen && (
                <FullscreenExitButton onExit={exitFullscreen} variant="light" />
              )}
              
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
                  key={`lyrics-inner-${state.currentSongId}`}
                  ref={viewerLyricsContainerRef}
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

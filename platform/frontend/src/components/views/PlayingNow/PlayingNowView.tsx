import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { usePlayingNow } from '../../../context/PlayingNowContext';
import { useAuth } from '../../../context/AuthContext';
import { useRoom } from '../../../context/RoomContext';
import { songsApi } from '../../../services/api';
import {
  calculateVerses,
  calculateVersesForLyricsMode,
  getVerseLinesForDisplay,
  findVerseForLine,
  DEFAULT_LINES_PER_VERSE,
} from '../../../utils/verseCalculator';
import { groupIntoSectionsWithIndices } from '../../../utils/songDisplay';
import { useDynamicFontSize } from '../../../hooks/useDynamicFontSize';
import { getSongBackground } from '../../../utils/backgrounds';
import { getRoomSplash } from '../../../utils/splash';
import {
  requestFullscreen,
  exitFullscreen as exitFullscreenUtil,
  addFullscreenChangeListener,
  isInFullscreen,
} from '../../../utils/fullscreen';
import { FullscreenExitButton } from '../../common/FullscreenExitButton';
import { formatCredits } from '../../../utils/formatCredits';
import { useVerseFontSize } from './hooks/useVerseFontSize';
import { SplashScreen } from './common/SplashScreen';
import { LoadingState } from './common/LoadingState';
import { TopBar } from './common/TopBar';
import { AdminChordsDisplay } from './admin/AdminChordsDisplay';
import { ViewerChordsDisplay } from './viewers/ViewerChordsDisplay';
import { ViewerFullLyricsDisplay } from './viewers/ViewerFullLyricsDisplay';
import { ViewerSingleVerseDisplay } from './viewers/ViewerSingleVerseDisplay';
import type { ParsedSong, ParsedLine } from '../../../types';

export function PlayingNowView() {
  const {
    state,
    effectiveVersesEnabled,
    effectiveDisplayMode,
    setMaxVerseIndex,
    setVerse,
  } = usePlayingNow();
  const { isRoomOwner } = useAuth();
  const { room } = useRoom();

  const [lyrics, setLyrics] = useState<ParsedSong | null>(null);
  const [lyricsSongId, setLyricsSongId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [outgoingLines, setOutgoingLines] = useState<ParsedLine[]>([]);
  const [transitionDirection, setTransitionDirection] = useState<'up' | 'down'>('up');
  const [scrollPercent, setScrollPercent] = useState(100);
  const [currentBackground, setCurrentBackground] = useState('');
  const [splashUrl, setSplashUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const adminContainerRef = useRef<HTMLDivElement>(null);
  const viewerChordsContainerRef = useRef<HTMLDivElement>(null);
  const viewerLyricsContainerRef = useRef<HTMLDivElement>(null);
  const viewerVerseContainerRef = useRef<HTMLDivElement>(null);
  const persistentFullscreenContainerRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen mode
  const enterFullscreen = useCallback(() => {
    requestFullscreen(persistentFullscreenContainerRef.current);
  }, []);

  const exitFullscreen = useCallback(() => {
    exitFullscreenUtil();
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isInFullscreen());
    };
    return addFullscreenChangeListener(handleFullscreenChange);
  }, []);

  // Track previous song ID to detect song changes synchronously
  const prevSongIdForLyricsRef = useRef(state.currentSongId);

  // Clear lyrics synchronously when song changes
  if (state.currentSongId !== prevSongIdForLyricsRef.current) {
    prevSongIdForLyricsRef.current = state.currentSongId;
    if (lyrics !== null) {
      setLyrics(null);
      setLyricsSongId(null);
    }
  }

  // Fetch lyrics when song changes
  useEffect(() => {
    if (state.currentSongId) {
      setIsLoading(true);
      const songId = state.currentSongId;
      songsApi
        .getLyrics(songId)
        .then((loadedLyrics) => {
          if (songId === prevSongIdForLyricsRef.current) {
            setLyrics(loadedLyrics);
            setLyricsSongId(songId);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
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

  // Calculate verses
  const linesPerVerse = state.projectorLinesPerVerse ?? DEFAULT_LINES_PER_VERSE;
  const verses = useMemo(() => {
    if (!lyrics) return [];
    if (state.displayMode === 'lyrics') {
      return calculateVersesForLyricsMode(lyrics.lines, linesPerVerse);
    }
    return calculateVerses(lyrics.lines, linesPerVerse);
  }, [lyrics, linesPerVerse, state.displayMode]);

  // Update context with max verse index
  useEffect(() => {
    setMaxVerseIndex(Math.max(0, verses.length - 1));
  }, [verses.length, setMaxVerseIndex]);

  // Get current verse (clamped to valid range)
  const currentVerseIndex = Math.min(state.currentVerseIndex, Math.max(0, verses.length - 1));
  const currentVerse = verses[currentVerseIndex];

  // Group lines into sections
  const adminSections = useMemo(() => {
    if (!lyrics) return [];
    return groupIntoSectionsWithIndices(lyrics.lines, true);
  }, [lyrics]);

  const viewerLyricsSections = useMemo(() => {
    if (!lyrics) return [];
    return groupIntoSectionsWithIndices(lyrics.lines, false);
  }, [lyrics]);

  // Determine viewer mode
  const viewerShowsChords = effectiveDisplayMode === 'chords';
  const viewerShowsSingleVerse = !viewerShowsChords && effectiveVersesEnabled;

  // Should admin show purple highlight?
  const showPurpleHighlight = state.displayMode === 'lyrics' && state.versesEnabled;

  // Dynamic font sizing for admin view
  useDynamicFontSize(adminContainerRef, [adminSections, showPurpleHighlight, currentVerseIndex, isFullscreen]);

  // Dynamic font sizing for viewer chords view
  useDynamicFontSize(viewerChordsContainerRef, [
    adminSections,
    viewerShowsChords,
    state.currentSongId,
    isFullscreen,
  ]);

  // Dynamic font sizing for viewer lyrics full view
  useDynamicFontSize(viewerLyricsContainerRef, [
    viewerLyricsSections,
    !viewerShowsChords && !viewerShowsSingleVerse,
    viewerShowsSingleVerse,
    state.currentSongId,
    isFullscreen,
  ]);

  // Get current verse lines for display
  const currentVerseLines = useMemo(() => {
    if (!lyrics || verses.length === 0) return [];
    return getVerseLinesForDisplay(lyrics.lines, verses, currentVerseIndex, linesPerVerse);
  }, [lyrics, verses, currentVerseIndex, linesPerVerse]);

  // Verse font sizing for viewer single-verse mode
  useVerseFontSize(
    viewerVerseContainerRef,
    [state.currentSongId, currentVerse, viewerShowsSingleVerse, isTransitioning, currentVerseLines.length, lyricsAreValid, isFullscreen],
    isTransitioning,
    false,
    state.currentSongId,
    !lyricsAreValid
  );

  // Handle verse transition animation
  const prevVerseIndexRef = useRef(state.currentVerseIndex);
  useLayoutEffect(() => {
    if (prevVerseIndexRef.current !== state.currentVerseIndex && lyrics && verses.length > 0) {
      const fromIndex = prevVerseIndexRef.current;
      const toIndex = state.currentVerseIndex;

      const maxVerseIndex = verses.length - 1;
      if (fromIndex < 0 || fromIndex > maxVerseIndex || toIndex < 0 || toIndex > maxVerseIndex) {
        prevVerseIndexRef.current = state.currentVerseIndex;
        return;
      }

      if (fromIndex === toIndex) {
        prevVerseIndexRef.current = state.currentVerseIndex;
        return;
      }

      const goingForward = toIndex > fromIndex;

      const outgoing = getVerseLinesForDisplay(lyrics.lines, verses, fromIndex, linesPerVerse);
      const incoming = getVerseLinesForDisplay(lyrics.lines, verses, toIndex, linesPerVerse);

      let overlapCount = 0;
      const minLen = Math.min(outgoing.length, incoming.length);

      if (goingForward) {
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

      const lineCount = outgoing.length;
      const scrollPct = lineCount > 0 ? ((lineCount - overlapCount) / lineCount) * 100 : 100;

      setOutgoingLines(outgoing);
      setScrollPercent(scrollPct);
      setTransitionDirection(goingForward ? 'up' : 'down');
      setIsTransitioning(true);

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
  const handleLineClick = useCallback(
    (lineIndex: number) => {
      if (!isRoomOwner || !showPurpleHighlight) return;
      const verseIdx = findVerseForLine(verses, lineIndex);
      if (verseIdx >= 0) {
        setVerse(verseIdx);
      }
    },
    [isRoomOwner, showPurpleHighlight, verses, setVerse]
  );

  // Check if a line should be highlighted in the current verse
  const isLineInCurrentVerse = useCallback(
    (lineIndex: number): boolean => {
      if (!currentVerse) return false;
      return lineIndex >= currentVerse.highlightStartIndex && lineIndex <= currentVerse.endIndex;
    },
    [currentVerse]
  );

  // Calculate RTL and verse state
  const isRtl = lyrics?.metadata.direction === 'rtl';
  const isAtFirstVerse = currentVerseIndex === 0;
  const isAtLastVerse = currentVerseIndex >= verses.length - 1;

  return (
    <div
      ref={persistentFullscreenContainerRef}
      className={`playing-now-persistent-fullscreen ${isFullscreen ? 'is-fullscreen' : ''}`}
    >
      {/* No song playing - show splash screen */}
      {!state.currentSongId && (
        <SplashScreen
          splashUrl={splashUrl}
          roomDisplayName={room?.displayName || null}
          isFullscreen={isFullscreen}
          onEnterFullscreen={enterFullscreen}
          onExitFullscreen={exitFullscreen}
        />
      )}

      {/* Loading state */}
      {state.currentSongId && (isLoading || !lyricsAreValid) && <LoadingState />}

      {/* Song content - only render when lyrics are valid */}
      {state.currentSongId && lyricsAreValid && (
        <div className={`playing-now-view ${isRtl ? 'rtl' : 'ltr'}`}>
          {/* Top bar - hidden in fullscreen */}
          {!isFullscreen && (
            <TopBar
              lyrics={lyrics}
              song={state.song}
              isRtl={isRtl}
              versesCount={verses.length}
              isAtFirstVerse={isAtFirstVerse}
              isAtLastVerse={isAtLastVerse}
              currentVerseIndex={currentVerseIndex}
              onEnterFullscreen={enterFullscreen}
            />
          )}

          {/* === ADMIN VIEW === */}
          {isRoomOwner && (
            <AdminChordsDisplay
              lyrics={lyrics}
              sections={adminSections}
              song={state.song}
              isRtl={isRtl}
              isFullscreen={isFullscreen}
              showPurpleHighlight={showPurpleHighlight}
              versesCount={verses.length}
              isAtFirstVerse={isAtFirstVerse}
              isAtLastVerse={isAtLastVerse}
              containerRef={adminContainerRef}
              onExitFullscreen={exitFullscreen}
              onLineClick={handleLineClick}
              isLineInCurrentVerse={isLineInCurrentVerse}
            />
          )}

          {/* === VIEWER VIEW === */}
          {!isRoomOwner && (
            <>
              {/* Mode 1: Chords enabled */}
              {viewerShowsChords && (
                <ViewerChordsDisplay
                  lyrics={lyrics}
                  sections={adminSections}
                  song={state.song}
                  isRtl={isRtl}
                  isFullscreen={isFullscreen}
                  containerRef={viewerChordsContainerRef}
                  songId={state.currentSongId}
                  onExitFullscreen={exitFullscreen}
                />
              )}

              {/* Lyrics modes */}
              {!viewerShowsChords && (
                <div
                  className="fullscreen-container"
                  style={
                    currentBackground
                      ? ({ '--viewer-bg': `url('${currentBackground}')` } as React.CSSProperties)
                      : undefined
                  }
                >
                  {/* Exit button - only visible in fullscreen */}
                  {isFullscreen && <FullscreenExitButton onExit={exitFullscreen} variant="light" />}

                  {/* Song metadata header - only visible in fullscreen */}
                  {isFullscreen && (
                    <div className={`fullscreen-song-header ${isRtl ? 'rtl' : 'ltr'}`}>
                      <h1 className="fullscreen-title">{lyrics!.metadata.title}</h1>
                      <div className="fullscreen-artist">{lyrics!.metadata.artist}</div>
                      {state.song &&
                        (state.song.composers?.length ||
                          state.song.lyricists?.length ||
                          state.song.translators?.length) && (
                          <div className="fullscreen-credits">{formatCredits(state.song, isRtl)}</div>
                        )}
                    </div>
                  )}

                  {/* Mode 2: Lyrics, verses off - full lyrics view */}
                  {!viewerShowsSingleVerse && (
                    <ViewerFullLyricsDisplay
                      sections={viewerLyricsSections}
                      containerRef={viewerLyricsContainerRef}
                      songId={state.currentSongId}
                    />
                  )}

                  {/* Mode 3: Lyrics, verses on - single verse, centered */}
                  {viewerShowsSingleVerse && (
                    <ViewerSingleVerseDisplay
                      currentVerseLines={currentVerseLines}
                      outgoingLines={outgoingLines}
                      isTransitioning={isTransitioning}
                      transitionDirection={transitionDirection}
                      scrollPercent={scrollPercent}
                      containerRef={viewerVerseContainerRef}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

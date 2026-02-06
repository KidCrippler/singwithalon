import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePlayingNow } from '../../../context/PlayingNowContext';
import { useAuth } from '../../../context/AuthContext';
import { useRoom } from '../../../context/RoomContext';
import { songsApi } from '../../../services/api';
import {
  calculateVerses,
  calculateVersesForLyricsMode,
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
import { SplashScreen } from './common/SplashScreen';
import { LoadingState } from './common/LoadingState';
import { TopBar } from './common/TopBar';
import { AdminChordsDisplay } from './admin/AdminChordsDisplay';
import { ViewerChordsDisplay } from './viewers/ViewerChordsDisplay';
import { ViewerFullLyricsDisplay } from './viewers/ViewerFullLyricsDisplay';
import { ViewerZoomableVerseDisplay } from './viewers/ViewerZoomableVerseDisplay';
import type { ParsedSong } from '../../../types';

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
  const [currentBackground, setCurrentBackground] = useState('');
  const [splashUrl, setSplashUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const adminContainerRef = useRef<HTMLDivElement>(null);
  const viewerChordsContainerRef = useRef<HTMLDivElement>(null);
  const viewerLyricsContainerRef = useRef<HTMLDivElement>(null);
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

                  {/* Mode 3: Lyrics, verses on - zoomable verse display */}
                  {viewerShowsSingleVerse && (
                    <ViewerZoomableVerseDisplay
                      lyrics={lyrics}
                      verses={verses}
                      currentVerseIndex={currentVerseIndex}
                      isRtl={isRtl}
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

import { useState, useRef } from 'react';
import { usePlayingNow } from '../../../../context/PlayingNowContext';
import { TransposeControls } from '../../../TransposeControls';

interface AdminControlsProps {
  versesCount: number;
  isAtFirstVerse: boolean;
  isAtLastVerse: boolean;
  currentVerseIndex: number;
  onEnterFullscreen: () => void;
}

export function AdminControls({
  versesCount,
  isAtFirstVerse,
  isAtLastVerse,
  currentVerseIndex,
  onEnterFullscreen,
}: AdminControlsProps) {
  const {
    state,
    activePlaylist,
    nextVerse,
    prevVerse,
    setKeyOffset,
    setKeyOffsetAndSync,
    syncKeyToAll,
    setDisplayMode,
    toggleVersesEnabled,
    nextPlaylistSong,
    prevPlaylistSong,
    jumpToPlaylistSong,
    playlistLength,
    playlistPlayedSongIds,
  } = usePlayingNow();

  // Playlist buttons are enabled only when the current song was triggered from the playlist
  // Check both server position AND localStorage played tracking (survives playlist switching)
  const isPlaylistActive = (() => {
    if (!activePlaylist || !state.currentSongId) return false;
    // Server position matches
    if (state.playlistPosition >= 0 && activePlaylist.songs[state.playlistPosition]?.songId === state.currentSongId) return true;
    // Fallback: song is in this playlist's played set (localStorage) and exists in the song list
    if (playlistPlayedSongIds.includes(state.currentSongId) && activePlaylist.songs.some(s => s.songId === state.currentSongId)) return true;
    return false;
  })();

  // Find effective position from either server state or song list lookup
  const effectivePosition = (() => {
    if (state.playlistPosition >= 0 && activePlaylist?.songs[state.playlistPosition]?.songId === state.currentSongId) {
      return state.playlistPosition;
    }
    if (!activePlaylist || !state.currentSongId) return -1;
    const idx = activePlaylist.songs.findIndex(s => s.songId === state.currentSongId);
    return idx;
  })();

  const canGoNext = isPlaylistActive && effectivePosition < playlistLength - 1;
  const canGoPrev = isPlaylistActive && effectivePosition > 0;

  const [peekVisible, setPeekVisible] = useState(false);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextSong = activePlaylist?.songs[effectivePosition + 1] ?? null;

  const handlePeek = () => {
    if (!nextSong) return;
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    setPeekVisible(true);
    peekTimerRef.current = setTimeout(() => setPeekVisible(false), 3000);
  };

  // Use jump when server position is stale (was reset by playlist switch)
  const serverPositionValid = state.playlistPosition >= 0 &&
    activePlaylist?.songs[state.playlistPosition]?.songId === state.currentSongId;

  const handleNext = () => {
    if (serverPositionValid) {
      nextPlaylistSong();
    } else {
      jumpToPlaylistSong(effectivePosition + 1);
    }
  };

  const handlePrev = () => {
    if (serverPositionValid) {
      prevPlaylistSong();
    } else {
      jumpToPlaylistSong(effectivePosition - 1);
    }
  };

  return (
    <div className="admin-controls">
      <button
        onClick={prevVerse}
        title="פסוק קודם"
        disabled={!state.versesEnabled || isAtFirstVerse}
        className={!state.versesEnabled || isAtFirstVerse ? 'disabled' : ''}
      >
        ↑
      </button>
      <button
        onClick={nextVerse}
        title="פסוק הבא"
        disabled={!state.versesEnabled || isAtLastVerse}
        className={!state.versesEnabled || isAtLastVerse ? 'disabled' : ''}
      >
        ↓
      </button>
      <button
        onClick={toggleVersesEnabled}
        title={state.versesEnabled ? 'בטל מצב פסוקים' : 'הפעל מצב פסוקים'}
        className={state.versesEnabled ? 'active' : ''}
      >
        📖
      </button>
      <button
        onClick={() => setDisplayMode(state.displayMode === 'lyrics' ? 'chords' : 'lyrics')}
        title={state.displayMode === 'lyrics' ? 'הצג אקורדים לצופים' : 'הצג מילים לצופים'}
      >
        {state.displayMode === 'lyrics' ? '🎸' : '🎤'}
      </button>
      {/* Verse indicator - only when verses enabled */}
      {state.versesEnabled && versesCount > 0 && (
        <span className="verse-indicator">
          {currentVerseIndex + 1}/{versesCount}
        </span>
      )}
      {/* Playlist song navigation - visually separated */}
      {state.activePlaylistId && playlistLength > 0 && (
        <>
          <span className="controls-separator" />
          <button
            onClick={handleNext}
            title="שיר הבא"
            disabled={!canGoNext}
            className={!canGoNext ? 'disabled' : ''}
          >
            ⏭
          </button>
          <div className="playlist-position-wrapper">
            {peekVisible && nextSong && (
              <div className="next-song-peek">
                הבא: {nextSong.songName}
              </div>
            )}
            <button
              className="playlist-position"
              onClick={handlePeek}
              title="לחץ לראות השיר הבא"
              disabled={!canGoNext}
            >
              {activePlaylist && <span className="playlist-name">{activePlaylist.name}</span>}
              {isPlaylistActive ? `${effectivePosition + 1}/${playlistLength}` : `-/${playlistLength}`}
            </button>
          </div>
          <button
            onClick={handlePrev}
            title="שיר קודם"
            disabled={!canGoPrev}
            className={!canGoPrev ? 'disabled' : ''}
          >
            ⏮
          </button>
          <span className="controls-separator" />
        </>
      )}
      {/* Transpose controls - always visible for admin */}
      <TransposeControls
        currentOffset={state.currentKeyOffset}
        adminOffset={state.currentKeyOffset}
        isAdmin={true}
        onOffsetChange={setKeyOffset}
        onSync={syncKeyToAll}
      />
      {typeof state.song?.keyShiftToOriginal === 'number' && (
        <button
          onClick={() => setKeyOffsetAndSync(state.song!.keyShiftToOriginal!)}
          title="עבור לסולם המקורי (וסנכרן לכולם)"
          className={state.currentKeyOffset === state.song.keyShiftToOriginal ? 'active' : ''}
        >
          🎯
        </button>
      )}
      {/* Fullscreen button for admin */}
      <button
        onClick={onEnterFullscreen}
        title="מסך מלא"
        className="fullscreen-btn"
        aria-label="מסך מלא"
      />
    </div>
  );
}

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
    syncKeyToAll,
    setDisplayMode,
    toggleVersesEnabled,
    nextPlaylistSong,
    prevPlaylistSong,
    playlistLength,
  } = usePlayingNow();

  // Playlist buttons are enabled only when the current song was triggered from the playlist
  const isPlaylistActive = state.playlistPosition >= 0 &&
    activePlaylist?.songs[state.playlistPosition]?.songId === state.currentSongId;

  const canGoNext = isPlaylistActive && state.playlistPosition < playlistLength - 1;
  const canGoPrev = isPlaylistActive && state.playlistPosition > 0;

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
            onClick={nextPlaylistSong}
            title="שיר הבא"
            disabled={!canGoNext}
            className={!canGoNext ? 'disabled' : ''}
          >
            ⏭
          </button>
          <span className="playlist-position">
            {activePlaylist && <span className="playlist-name">{activePlaylist.name}</span>}
            {isPlaylistActive ? `${state.playlistPosition + 1}/${playlistLength}` : `-/${playlistLength}`}
          </span>
          <button
            onClick={prevPlaylistSong}
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

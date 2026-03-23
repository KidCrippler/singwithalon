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
    nextVerse,
    prevVerse,
    setKeyOffset,
    syncKeyToAll,
    setDisplayMode,
    toggleVersesEnabled,
  } = usePlayingNow();

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

import { usePlayingNow } from '../../../../context/PlayingNowContext';
import { TransposeControls } from '../../../TransposeControls';

interface ViewerControlsProps {
  onEnterFullscreen: () => void;
}

export function ViewerControls({ onEnterFullscreen }: ViewerControlsProps) {
  const {
    state,
    effectiveDisplayMode,
    effectiveVersesEnabled,
    effectiveKeyOffset,
    viewerModeLocked,
    viewerDisplayMode,
    viewerVersesEnabled,
    isKeyOutOfSync,
    toggleViewerLock,
    setViewerDisplayMode,
    setViewerVersesEnabled,
    setViewerKeyOverride,
  } = usePlayingNow();

  return (
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
        title={effectiveDisplayMode === 'lyrics' ? 'הצג אקורדים' : 'הצג מילים'}
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
        title={effectiveVersesEnabled ? 'הצג שיר מלא' : 'הפעל מצב פסוקים'}
        className={effectiveVersesEnabled ? 'active' : ''}
        disabled={!viewerModeLocked || effectiveDisplayMode === 'chords'}
      >
        📖
      </button>
      {/* Button 3: Lock button - toggle lock on/off */}
      <button
        onClick={toggleViewerLock}
        title={viewerModeLocked ? 'בטל נעילה (עקוב אחרי המנחה)' : 'נעל הגדרות (שמור העדפות)'}
        className={`lock-btn ${viewerModeLocked ? 'locked' : ''}`}
      >
        {viewerModeLocked ? '🔒' : '🔓'}
      </button>
      {/* Fullscreen button - available in all modes */}
      <button
        onClick={onEnterFullscreen}
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
  );
}

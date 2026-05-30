import { usePlayingNow } from '../../../../context/PlayingNowContext';
import { FullscreenExitButton } from '../../../common/FullscreenExitButton';
import { ChordsFullscreenHeader } from '../../../common/ChordsFullscreenHeader';
import { LineDisplay } from '../../../common/LineDisplay';
import { TransposeControls } from '../../../TransposeControls';
import type { ParsedLine, ParsedSong, Song } from '../../../../types';

interface IndexedLine {
  line: ParsedLine;
  originalIndex: number;
}

interface AdminChordsDisplayProps {
  lyrics: ParsedSong;
  sections: IndexedLine[][];
  song: Song | null;
  isRtl: boolean;
  isFullscreen: boolean;
  showPurpleHighlight: boolean;
  versesCount: number;
  isAtFirstVerse: boolean;
  isAtLastVerse: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onExitFullscreen: () => void;
  onLineClick?: (lineIndex: number) => void;
  isLineInCurrentVerse: (lineIndex: number) => boolean;
}

export function AdminChordsDisplay({
  lyrics,
  sections,
  song,
  isRtl,
  isFullscreen,
  showPurpleHighlight,
  versesCount,
  isAtFirstVerse,
  isAtLastVerse,
  containerRef,
  onExitFullscreen,
  onLineClick,
  isLineInCurrentVerse,
}: AdminChordsDisplayProps) {
  const {
    state,
    nextVerse,
    prevVerse,
    setKeyOffset,
    setKeyOffsetAndSync,
    syncKeyToAll,
    setDisplayMode,
    toggleVersesEnabled,
  } = usePlayingNow();

  const currentVerseIndex = state.currentVerseIndex;

  return (
    <>
      {/* Exit button - only visible in fullscreen */}
      {isFullscreen && <FullscreenExitButton onExit={onExitFullscreen} variant="dark" />}

      {/* Compact header - only visible in fullscreen */}
      {isFullscreen && lyrics && (
        <ChordsFullscreenHeader
          title={lyrics.metadata.title}
          artist={lyrics.metadata.artist}
          song={song}
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
          {state.versesEnabled && versesCount > 0 && (
            <span className="verse-indicator">
              {currentVerseIndex + 1}/{versesCount}
            </span>
          )}
          <TransposeControls
            currentOffset={state.currentKeyOffset}
            adminOffset={state.currentKeyOffset}
            isAdmin={true}
            onOffsetChange={setKeyOffset}
            onSync={syncKeyToAll}
          />
          {typeof song?.keyShiftToOriginal === 'number' && (
            <button
              onClick={() => setKeyOffsetAndSync(song.keyShiftToOriginal!)}
              title="עבור לסולם המקורי (וסנכרן לכולם)"
              className={state.currentKeyOffset === song.keyShiftToOriginal ? 'active' : ''}
            >
              🎯
            </button>
          )}
          <button onClick={onExitFullscreen} title="יציאה ממסך מלא" className="exit-fullscreen-btn">
            ⤡
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className={`lyrics-container chords ${showPurpleHighlight ? 'with-verse-highlight' : ''} ${isFullscreen ? 'in-fullscreen' : ''}`}
      >
        {sections.map((section, sectionIndex) => (
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
                  onClick={showPurpleHighlight ? onLineClick : undefined}
                  isHighlighted={isHighlighted}
                />
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

import { usePlayingNow } from '../../../../context/PlayingNowContext';
import { FullscreenExitButton } from '../../../common/FullscreenExitButton';
import { ChordsFullscreenHeader } from '../../../common/ChordsFullscreenHeader';
import { LineDisplay } from '../../../common/LineDisplay';
import { ChordSheetAutoFit } from '../../ChordSheetAutoFit';
import { useChordRenderer } from '../../../../hooks/useChordRenderer';
import type { ParsedLine, ParsedSong, Song } from '../../../../types';

interface IndexedLine {
  line: ParsedLine;
  originalIndex: number;
}

interface ViewerChordsDisplayProps {
  lyrics: ParsedSong;
  sections: IndexedLine[][];
  song: Song | null;
  isRtl: boolean;
  isFullscreen: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  songId: number | null;
  onExitFullscreen: () => void;
}

export function ViewerChordsDisplay({
  lyrics,
  sections,
  song,
  isRtl,
  isFullscreen,
  containerRef,
  songId,
  onExitFullscreen,
}: ViewerChordsDisplayProps) {
  const { effectiveKeyOffset } = usePlayingNow();
  const renderer = useChordRenderer();

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

      {renderer === 'new' ? (
        // New renderer owns its own box (no .lyrics-container columns to fight,
        // and not driven by useDynamicFontSize).
        <ChordSheetAutoFit song={lyrics} keyOffset={effectiveKeyOffset} />
      ) : (
        <div
          key={`chords-inner-${songId}`}
          ref={containerRef}
          className={`lyrics-container chords ${isFullscreen ? 'in-fullscreen' : ''}`}
        >
          {sections.map((section, sectionIndex) => (
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
    </>
  );
}

import { usePlayingNow } from '../../../../context/PlayingNowContext';
import { FullscreenExitButton } from '../../../common/FullscreenExitButton';
import { ChordsFullscreenHeader } from '../../../common/ChordsFullscreenHeader';
import { SectionDisplay } from '../../../common/SectionDisplay';
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

      <div
        key={`chords-inner-${songId}`}
        ref={containerRef}
        className={`lyrics-container chords ${isFullscreen ? 'in-fullscreen' : ''}`}
      >
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="lyrics-section">
            <SectionDisplay
              section={section}
              keyOffset={effectiveKeyOffset}
              isRtl={isRtl}
            />
          </div>
        ))}
      </div>
    </>
  );
}

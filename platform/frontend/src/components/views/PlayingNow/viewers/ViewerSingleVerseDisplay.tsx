import { LineDisplay } from '../../../common/LineDisplay';
import type { ParsedLine } from '../../../../types';

interface ViewerSingleVerseDisplayProps {
  currentVerseLines: ParsedLine[];
  outgoingLines: ParsedLine[];
  isTransitioning: boolean;
  transitionDirection: 'up' | 'down';
  scrollPercent: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ViewerSingleVerseDisplay({
  currentVerseLines,
  outgoingLines,
  isTransitioning,
  transitionDirection,
  scrollPercent,
  containerRef,
}: ViewerSingleVerseDisplayProps) {
  return (
    <div ref={containerRef} className="lyrics-container lyrics verse-single">
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
          <LineDisplay key={lineIndex} line={line} showChords={false} lineIndex={lineIndex} />
        ))
      )}
    </div>
  );
}

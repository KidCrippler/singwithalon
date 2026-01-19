import { useEffect, useState } from 'react';
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
  // Store measurements taken before transition starts
  const [measurements, setMeasurements] = useState({ containerHeight: 0, contentHeight: 0, lineHeight: 0 });

  // Measure when not transitioning (so we have values ready for next transition)
  useEffect(() => {
    if (!isTransitioning && containerRef.current) {
      const container = containerRef.current;
      const containerHeight = container.getBoundingClientRect().height;

      // Find all lines and measure
      const lines = container.querySelectorAll('.line');
      if (lines.length > 0) {
        const firstLine = lines[0];
        const lastLine = lines[lines.length - 1];
        const lineHeight = firstLine.getBoundingClientRect().height;
        const contentHeight = lastLine.getBoundingClientRect().bottom - firstLine.getBoundingClientRect().top;

        setMeasurements({ containerHeight, contentHeight, lineHeight });
      }
    }
  }, [isTransitioning, currentVerseLines, containerRef]);

  // Calculate pixel-based scroll distance
  // Both verses are centered (justify-content: center), so at translateY(0) their content is centered
  // For the incoming's top line to overlap with outgoing's bottom line:
  // - Outgoing content is centered: its bottom line's bottom is at (containerHeight + contentHeight) / 2
  // - Incoming content is centered: its top line's top is at (containerHeight - contentHeight) / 2
  // - We want incoming's top to be at outgoing's bottom minus one lineHeight
  // - So incoming needs to start at: (containerHeight + contentHeight) / 2 - lineHeight - (containerHeight - contentHeight) / 2
  // - Simplifies to: contentHeight - lineHeight
  const { containerHeight, contentHeight, lineHeight } = measurements;

  // Distance incoming should start below its centered position
  const scrollDistancePx = contentHeight - lineHeight;

  return (
    <div ref={containerRef} className="lyrics-container lyrics verse-single">
      {isTransitioning ? (
        <div
          className={`verse-transition-wrapper transition-${transitionDirection}`}
          style={{
            '--scroll-distance': `${scrollDistancePx}px`,
          } as React.CSSProperties}
        >
          <div className="verse-content outgoing">
            {outgoingLines.map((line, lineIndex) => {
              // Find the last non-empty line index to hide it
              const lastNonEmptyIndex = outgoingLines.findLastIndex(l => l.type !== 'empty' && l.text.trim() !== '');
              return (
                <LineDisplay
                  key={`out-${lineIndex}`}
                  line={line}
                  showChords={false}
                  lineIndex={lineIndex}
                  style={lineIndex === lastNonEmptyIndex ? { visibility: 'hidden' } : undefined}
                />
              );
            })}
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

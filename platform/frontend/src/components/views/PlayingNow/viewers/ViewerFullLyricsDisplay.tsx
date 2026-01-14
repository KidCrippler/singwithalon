import { LineDisplay } from '../../../common/LineDisplay';
import type { ParsedLine } from '../../../../types';

interface IndexedLine {
  line: ParsedLine;
  originalIndex: number;
}

interface ViewerFullLyricsDisplayProps {
  sections: IndexedLine[][];
  containerRef: React.RefObject<HTMLDivElement | null>;
  songId: number | null;
}

export function ViewerFullLyricsDisplay({
  sections,
  containerRef,
  songId,
}: ViewerFullLyricsDisplayProps) {
  return (
    <div
      key={`lyrics-inner-${songId}`}
      ref={containerRef}
      className="lyrics-container lyrics"
    >
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="lyrics-section">
          {section.map((indexedLine) => (
            <LineDisplay
              key={indexedLine.originalIndex}
              line={indexedLine.line}
              showChords={false}
              lineIndex={indexedLine.originalIndex}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

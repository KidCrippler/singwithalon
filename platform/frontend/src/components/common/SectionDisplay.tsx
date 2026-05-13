import { LineDisplay } from './LineDisplay';
import { ChordLyricLine } from './ChordLyricLine';
import type { ParsedLine } from '../../types';

interface IndexedLine {
  line: ParsedLine;
  originalIndex: number;
}

interface SectionDisplayProps {
  section: IndexedLine[];
  keyOffset: number;
  isRtl?: boolean;
  showPurpleHighlight?: boolean;
  onLineClick?: (lineIndex: number) => void;
  isLineInCurrentVerse?: (lineIndex: number) => boolean;
}

export function SectionDisplay({
  section,
  keyOffset,
  isRtl,
  showPurpleHighlight,
  onLineClick,
  isLineInCurrentVerse,
}: SectionDisplayProps) {
  const elements: JSX.Element[] = [];
  let i = 0;

  while (i < section.length) {
    const indexedLine = section[i];
    const isHighlighted = showPurpleHighlight && isLineInCurrentVerse?.(indexedLine.originalIndex);

    if (
      indexedLine.line.type === 'chords' &&
      i + 1 < section.length &&
      section[i + 1].line.type === 'lyric'
    ) {
      const lyricIndexedLine = section[i + 1];
      elements.push(
        <ChordLyricLine
          key={indexedLine.originalIndex}
          chordLine={indexedLine.line}
          lyricLine={lyricIndexedLine.line}
          keyOffset={keyOffset}
          lineIndex={lyricIndexedLine.originalIndex}
          isRtl={isRtl}
          onClick={showPurpleHighlight ? onLineClick : undefined}
          isHighlighted={isHighlighted}
        />
      );
      i += 2;
    } else {
      elements.push(
        <LineDisplay
          key={indexedLine.originalIndex}
          line={indexedLine.line}
          showChords={true}
          lineIndex={indexedLine.originalIndex}
          keyOffset={keyOffset}
          onClick={showPurpleHighlight ? onLineClick : undefined}
          isHighlighted={isHighlighted}
        />
      );
      i++;
    }
  }

  return <>{elements}</>;
}

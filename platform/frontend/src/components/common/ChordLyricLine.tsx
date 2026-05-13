import { transposeChordLine } from '../../services/transpose';
import { formatChordLineForDisplay } from '../../services/chordDisplay';
import type { ParsedLine } from '../../types';

interface ChordLyricLineProps {
  chordLine: ParsedLine;
  lyricLine: ParsedLine;
  keyOffset: number;
  lineIndex: number;
  isRtl?: boolean;
  onClick?: (lineIndex: number) => void;
  isHighlighted?: boolean;
}

function unreverseChordLine(reversed: string): string {
  const withTokensReversed = reversed.replace(/\S+/g, token => token.split('').reverse().join(''));
  return withTokensReversed.split('').reverse().join('');
}

function parseChordPositions(chordLine: string): { chord: string; position: number }[] {
  const chords: { chord: string; position: number }[] = [];
  let i = 0;
  while (i < chordLine.length) {
    if (chordLine[i] !== ' ') {
      const start = i;
      while (i < chordLine.length && chordLine[i] !== ' ') i++;
      chords.push({ chord: chordLine.substring(start, i), position: start });
    } else {
      i++;
    }
  }
  return chords;
}

export function ChordLyricLine({
  chordLine,
  lyricLine,
  keyOffset,
  lineIndex,
  isRtl,
  onClick,
  isHighlighted,
}: ChordLyricLineProps) {
  const rawChord = chordLine.raw || chordLine.text;
  // For RTL, the backend sends reversed chord lines (for bidi-override rendering).
  // We need the original positions to anchor chords above lyric characters.
  const originalChord = isRtl ? unreverseChordLine(rawChord) : rawChord;
  const transposed = formatChordLineForDisplay(transposeChordLine(originalChord, keyOffset));
  const chords = parseChordPositions(transposed);

  const lyricText = lyricLine.text;
  const leadingSpaces = lyricText.match(/^ */)![0].length;
  let trimmedLyric = lyricText.trimStart();

  const adjustedChords = chords.map(c => ({
    chord: c.chord,
    position: Math.max(0, c.position - leadingSpaces),
  }));

  const maxChordPos = adjustedChords.length > 0
    ? adjustedChords[adjustedChords.length - 1].position + 1
    : 0;
  if (maxChordPos > trimmedLyric.length) {
    trimmedLyric = trimmedLyric + ' '.repeat(maxChordPos - trimmedLyric.length);
  }

  const spans: JSX.Element[] = [];
  let lastIdx = 0;
  let key = 0;

  for (const { chord, position } of adjustedChords) {
    if (position > lastIdx) {
      spans.push(<span key={key++}>{trimmedLyric.substring(lastIdx, position)}</span>);
    }
    const anchorChar = trimmedLyric[position] || ' ';
    spans.push(
      <span key={key++} className="chord-anchor">
        {anchorChar}
        <span className="chord-label">{chord}</span>
      </span>
    );
    lastIdx = Math.max(lastIdx, position + 1);
  }

  if (lastIdx < trimmedLyric.length) {
    spans.push(<span key={key++}>{trimmedLyric.substring(lastIdx)}</span>);
  }

  const handleClick = onClick ? () => onClick(lineIndex) : undefined;

  return (
    <div
      className={`line chord-lyric-combined ${isHighlighted ? 'verse-highlighted' : ''}`}
      onClick={handleClick}
      data-line-index={lineIndex}
    >
      {spans}
    </div>
  );
}

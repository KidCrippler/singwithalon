import { transposeChordLine } from '../../services/transpose';
import { formatChordLineForDisplay, segmentChordLine } from '../../services/chordDisplay';
import type { ParsedLine } from '../../types';

export interface LineDisplayProps {
  /** The parsed line to render */
  line: ParsedLine;
  /** Whether to show chords (false = lyrics-only mode, collapses spaces) */
  showChords: boolean;
  /** The line index (for data attribute and click handler) */
  lineIndex: number;
  /** Transposition offset for chord lines (semitones) */
  keyOffset?: number;
  /** Optional click handler */
  onClick?: (lineIndex: number) => void;
  /** Whether this line is highlighted (e.g., current verse or editor cursor) */
  isHighlighted?: boolean;
  /** CSS class name for the highlight state */
  highlightClassName?: string;
}

/**
 * Renders a single line of a song (directive, cue, chords, or lyrics).
 * Handles transposition, chord segmentation, and lyrics-mode space collapsing.
 */
export function LineDisplay({ 
  line, 
  showChords, 
  lineIndex, 
  keyOffset = 0, 
  onClick, 
  isHighlighted,
  highlightClassName = 'verse-highlighted'
}: LineDisplayProps) {
  const getText = () => {
    if (!showChords) {
      // In lyrics mode: trim and collapse consecutive spaces to single space
      return line.text.trim().replace(/ {2,}/g, ' ');
    }
    return line.type === 'chords' ? (line.raw || line.text) : line.text;
  };

  // Transpose chord lines and get segmented content (chords + inline directives)
  const getChordSegments = () => {
    const chordText = line.raw || line.text;
    const transposedAndFormatted = formatChordLineForDisplay(
      transposeChordLine(chordText, keyOffset)
    );
    return segmentChordLine(transposedAndFormatted);
  };

  const handleClick = onClick ? () => onClick(lineIndex) : undefined;

  return (
    <div 
      className={`line line-${line.type} ${isHighlighted ? highlightClassName : ''}`}
      onClick={handleClick}
      data-line-index={lineIndex}
    >
      {line.type === 'directive' ? (
        <span className="directive">{line.text}</span>
      ) : line.type === 'cue' ? (
        <span className="cue">{line.text}</span>
      ) : line.type === 'chords' ? (
        // Render chord line with inline directives styled separately
        getChordSegments().map((segment, i) => (
          segment.type === 'directive' ? (
            <span key={i} className="directive">{segment.text}</span>
          ) : (
            <span key={i} className="chords">{segment.text}</span>
          )
        ))
      ) : (
        <span className="lyric">{getText()}</span>
      )}
    </div>
  );
}


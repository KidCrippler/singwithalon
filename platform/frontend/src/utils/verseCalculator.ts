import type { ParsedLine, LineType } from '../types';

/**
 * Verse range with line indices
 */
export interface VerseRange {
  /** Index of first line in this verse (inclusive) */
  startIndex: number;
  /** Index of last line in this verse (inclusive) */
  endIndex: number;
  /** Number of lyrics-visible lines in this verse */
  visibleLineCount: number;
}

/**
 * Line types that are visible in lyrics-only mode and count toward verse boundaries
 */
const LYRICS_VISIBLE_TYPES: LineType[] = ['lyric', 'cue', 'empty'];

/**
 * Check if a line type is visible in lyrics-only mode
 * These are the lines that count toward the linesPerVerse limit
 */
export function isLyricsVisible(line: ParsedLine): boolean {
  return LYRICS_VISIBLE_TYPES.includes(line.type);
}

/**
 * Calculate verse ranges from parsed song lines.
 * 
 * Algorithm:
 * - Count only lyrics-visible lines (lyric, cue, empty) toward the limit
 * - Chord/directive lines belong to the verse of the lyrics they precede (look-ahead)
 * - Every `linesPerVerse` visible lines constitutes a new verse
 * 
 * Example: If a song starts with 7 chord lines followed by 8 lyric lines:
 * - Verse 1 includes all 15 lines (indices 0-14)
 * - The 7 chord lines are grouped with the 8 lyric lines that follow
 * 
 * @param lines - Parsed song lines
 * @param linesPerVerse - Number of lyrics-visible lines per verse (default 8)
 * @returns Array of verse ranges
 */
export function calculateVerses(lines: ParsedLine[], linesPerVerse: number = 8): VerseRange[] {
  if (lines.length === 0) {
    return [];
  }

  const verses: VerseRange[] = [];
  let currentVerseStart = 0;
  let visibleLineCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (isLyricsVisible(line)) {
      visibleLineCount++;
      
      // Check if we've reached the verse limit
      if (visibleLineCount >= linesPerVerse) {
        // End the current verse here
        verses.push({
          startIndex: currentVerseStart,
          endIndex: i,
          visibleLineCount,
        });
        
        // Start a new verse from the next line
        currentVerseStart = i + 1;
        visibleLineCount = 0;
      }
    }
    // Chord/directive lines don't count but stay with current verse
    // They'll be included when we finalize the verse
  }

  // Handle remaining lines (last verse may be incomplete)
  if (currentVerseStart < lines.length) {
    // Count visible lines in the remaining portion
    let remainingVisible = 0;
    for (let i = currentVerseStart; i < lines.length; i++) {
      if (isLyricsVisible(lines[i])) {
        remainingVisible++;
      }
    }
    
    // Only add if there are any lines (even if just chord lines)
    if (remainingVisible > 0 || currentVerseStart < lines.length) {
      verses.push({
        startIndex: currentVerseStart,
        endIndex: lines.length - 1,
        visibleLineCount: remainingVisible,
      });
    }
  }

  return verses;
}

/**
 * Get the lines for a specific verse, optionally filtered to lyrics-visible only
 * 
 * @param lines - All parsed song lines
 * @param verse - The verse range
 * @param lyricsOnly - If true, filter to only lyrics-visible lines
 * @returns Array of lines in the verse
 */
export function getVerseLines(
  lines: ParsedLine[],
  verse: VerseRange,
  lyricsOnly: boolean = false
): ParsedLine[] {
  const verseLines = lines.slice(verse.startIndex, verse.endIndex + 1);
  
  if (lyricsOnly) {
    return verseLines.filter(isLyricsVisible);
  }
  
  return verseLines;
}

/**
 * Find which verse a line index belongs to
 * 
 * @param verses - Array of verse ranges
 * @param lineIndex - The line index to find
 * @returns The verse index, or -1 if not found
 */
export function findVerseForLine(verses: VerseRange[], lineIndex: number): number {
  return verses.findIndex(
    verse => lineIndex >= verse.startIndex && lineIndex <= verse.endIndex
  );
}

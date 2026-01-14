import type { ParsedLine, LineType } from '../types';

/**
 * Default number of lyrics-visible lines per verse when no projector override is set
 */
export const DEFAULT_LINES_PER_VERSE = 10;

/**
 * Verse range with line indices
 */
export interface VerseRange {
  /** Index of first line in this verse (inclusive) - for display */
  startIndex: number;
  /** Index of last line in this verse (inclusive) - for display */
  endIndex: number;
  /** Number of lyrics-visible lines in this verse */
  visibleLineCount: number;
  /** 
   * Index of first line that "first appears" in this verse (for highlighting).
   * Lines before this index are overlap from the previous verse.
   * For verse 0, this equals startIndex.
   * For other verses, this is the first non-overlap line.
   */
  highlightStartIndex: number;
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
 * Filter lines for lyrics-only mode display.
 * Rules:
 * - Only lyrics-visible lines (lyric, cue, empty)
 * - No consecutive empty lines
 * - Optionally trim leading empty lines
 * 
 * @param lines - Lines to filter
 * @param trimLeadingEmpty - If true, remove leading empty lines (default true)
 * @returns Filtered array of lines
 */
export function filterForLyricsMode(lines: ParsedLine[], trimLeadingEmpty: boolean = true): ParsedLine[] {
  const result: ParsedLine[] = [];
  let prevWasEmpty = false;
  
  for (const line of lines) {
    if (!isLyricsVisible(line)) continue;
    
    if (line.type === 'empty') {
      if (prevWasEmpty) continue; // Skip consecutive empty lines
      prevWasEmpty = true;
    } else {
      prevWasEmpty = false;
    }
    
    result.push(line);
  }
  
  if (trimLeadingEmpty) {
    while (result.length > 0 && result[0].type === 'empty') {
      result.shift();
    }
  }
  
  return result;
}

/**
 * Calculate verse ranges from parsed song lines (for chords mode).
 * 
 * Algorithm:
 * - Count only lyrics-visible lines (lyric, cue, empty) toward the limit
 * - Chord/directive lines belong to the verse of the lyrics they precede (look-ahead)
 * - Every `linesPerVerse` visible lines constitutes a new verse
 * - No overlap in chords mode (highlightStartIndex === startIndex)
 * 
 * @param lines - Parsed song lines
 * @param linesPerVerse - Number of lyrics-visible lines per verse (default DEFAULT_LINES_PER_VERSE)
 * @returns Array of verse ranges
 */
export function calculateVerses(lines: ParsedLine[], linesPerVerse: number = DEFAULT_LINES_PER_VERSE): VerseRange[] {
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
          highlightStartIndex: currentVerseStart, // No overlap in chords mode
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
        highlightStartIndex: currentVerseStart, // No overlap in chords mode
      });
    }
  }

  return verses;
}

/**
 * Calculate verse ranges for lyrics-only mode without overlap.
 *
 * Algorithm:
 * - Each verse shows N lines with no overlap between verses
 * - The last verse is anchored at the end (shows final N lines or remaining lines)
 *
 * @param lines - Parsed song lines
 * @param linesPerVerse - Number of lyrics-visible lines per verse (default DEFAULT_LINES_PER_VERSE)
 * @returns Array of verse ranges
 */
export function calculateVersesForLyricsMode(lines: ParsedLine[], linesPerVerse: number = DEFAULT_LINES_PER_VERSE): VerseRange[] {
  if (lines.length === 0) {
    return [];
  }

  // Step 1: Build list of visible line info (after filtering)
  interface VisibleLine {
    originalIndex: number;
  }
  const visibleLines: VisibleLine[] = [];
  let prevWasEmpty = false;
  let seenNonEmpty = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!isLyricsVisible(line)) continue;

    if (line.type === 'empty') {
      if (prevWasEmpty) continue; // Skip consecutive empties
      if (!seenNonEmpty) continue; // Skip leading empties
      prevWasEmpty = true;
      visibleLines.push({ originalIndex: i });
    } else {
      prevWasEmpty = false;
      seenNonEmpty = true;
      visibleLines.push({ originalIndex: i });
    }
  }

  const totalVisible = visibleLines.length;

  // Step 2: Handle trivial cases
  if (totalVisible === 0) {
    return [];
  }

  if (totalVisible <= linesPerVerse) {
    // Single verse
    return [{
      startIndex: visibleLines[0].originalIndex,
      endIndex: visibleLines[totalVisible - 1].originalIndex,
      visibleLineCount: totalVisible,
      highlightStartIndex: visibleLines[0].originalIndex,
    }];
  }

  // Step 3: Calculate verse boundaries without overlap
  const N = linesPerVerse;
  const verses: VerseRange[] = [];

  let currentVisibleStart = 0;

  while (currentVisibleStart < totalVisible) {
    const currentVisibleEnd = Math.min(currentVisibleStart + N - 1, totalVisible - 1);

    verses.push({
      startIndex: visibleLines[currentVisibleStart].originalIndex,
      endIndex: visibleLines[currentVisibleEnd].originalIndex,
      visibleLineCount: currentVisibleEnd - currentVisibleStart + 1,
      highlightStartIndex: visibleLines[currentVisibleStart].originalIndex, // No overlap, all lines are highlighted
    });

    // Advance to next verse - no overlap
    currentVisibleStart = currentVisibleEnd + 1;
  }

  return verses;
}

/**
 * Get the lines for a specific verse, optionally filtered to lyrics-visible only
 * 
 * @param lines - All parsed song lines
 * @param verse - The verse range
 * @param lyricsOnly - If true, filter to only lyrics-visible lines with lyrics-mode rules
 * @returns Array of lines in the verse
 */
export function getVerseLines(
  lines: ParsedLine[],
  verse: VerseRange,
  lyricsOnly: boolean = false
): ParsedLine[] {
  const verseLines = lines.slice(verse.startIndex, verse.endIndex + 1);
  
  if (lyricsOnly) {
    // Apply lyrics mode filtering (no consecutive empties)
    // Don't trim leading empty - verse calculation already ensures no leading empties
    return filterForLyricsMode(verseLines, false);
  }
  
  return verseLines;
}

/**
 * Get lines for displaying a verse in lyrics mode.
 * 
 * With the overlap approach, each verse already includes the overlap lines,
 * so no additional padding is needed.
 * 
 * @param lines - All parsed song lines
 * @param verses - Array of all verse ranges
 * @param verseIndex - Index of the verse to display
 * @param _linesPerVerse - Unused (kept for API compatibility)
 * @returns Array of filtered lines for display
 */
export function getVerseLinesForDisplay(
  lines: ParsedLine[],
  verses: VerseRange[],
  verseIndex: number,
  _linesPerVerse: number = DEFAULT_LINES_PER_VERSE
): ParsedLine[] {
  if (verses.length === 0 || verseIndex < 0 || verseIndex >= verses.length) {
    return [];
  }
  
  const verse = verses[verseIndex];
  
  // Get the verse lines filtered for lyrics mode
  // With overlap, all verses already have the right lines
  return getVerseLines(lines, verse, true);
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

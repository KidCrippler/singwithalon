import type { ParsedLine, LineType } from '../types';

/**
 * Experimental verse calculator for ScrollDemoView testing.
 * This is a separate implementation to test the overlap-based scrolling algorithm
 * without affecting the main verseCalculator.ts used in production.
 */

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
  /**
   * Indices of lines shared with the next verse (empty array for last verse).
   * These lines appear at the end of this verse and the beginning of the next.
   * Used for font size transitions in ScrollDemoView.
   */
  sharedLineIndices?: number[];
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
 * Calculate verse ranges for lyrics-only mode with EXPERIMENTAL overlap algorithm.
 *
 * Algorithm (overlap approach):
 * - Each verse (except the first) starts with the last CONTENT line of the previous verse
 * - If the last content line is followed by empty lines, those are included in the overlap too
 * - This ensures the overlap is always visually meaningful (not just whitespace)
 * - The last verse is anchored at the end (shows final N lines)
 *
 * Highlighting rules:
 * - A line is highlighted only in the verse where it "first appears"
 * - For verse 0: all lines are highlighted
 * - For other verses: only lines after the overlap are highlighted
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
  // Track both the original index and whether it's empty
  interface VisibleLine {
    originalIndex: number;
    isEmpty: boolean;
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
      visibleLines.push({ originalIndex: i, isEmpty: true });
    } else {
      prevWasEmpty = false;
      seenNonEmpty = true;
      visibleLines.push({ originalIndex: i, isEmpty: false });
    }
  }

  const totalVisible = visibleLines.length;

  // Step 2: Handle trivial cases
  if (totalVisible === 0) {
    return [];
  }

  if (totalVisible <= linesPerVerse) {
    // Single verse - no overlap needed
    return [{
      startIndex: visibleLines[0].originalIndex,
      endIndex: visibleLines[totalVisible - 1].originalIndex,
      visibleLineCount: totalVisible,
      highlightStartIndex: visibleLines[0].originalIndex,
      sharedLineIndices: [],
    }];
  }

  // Step 3: Calculate verse boundaries with content-aware overlap
  // - First verse starts at 0, shows N lines
  // - Each subsequent verse starts at previous verse's last CONTENT line
  // - If last content line is followed by empties, include those in overlap
  // - Last verse is anchored at the end (shows final N lines)

  const N = linesPerVerse;
  const verses: VerseRange[] = [];

  // Track the highest line index shown so far (for highlight calculation)
  let maxShownVisibleIndex = -1;

  let currentVisibleStart = 0;

  while (currentVisibleStart < totalVisible) {
    const currentVisibleEnd = currentVisibleStart + N - 1;

    // Check if this verse would extend past the end
    if (currentVisibleEnd >= totalVisible - 1) {
      // This is the last verse - anchor it at the end
      const anchoredStart = Math.max(0, totalVisible - N);
      const anchoredEnd = totalVisible - 1;

      // Highlight starts after what was shown in previous verses
      const highlightStart = maxShownVisibleIndex + 1;

      // Calculate shared line indices for last verse
      const sharedLineIndices: number[] = [];
      if (anchoredStart <= maxShownVisibleIndex) {
        // There's overlap with previous verse
        for (let i = anchoredStart; i <= Math.min(maxShownVisibleIndex, anchoredEnd); i++) {
          sharedLineIndices.push(visibleLines[i].originalIndex);
        }
      }

      verses.push({
        startIndex: visibleLines[anchoredStart].originalIndex,
        endIndex: visibleLines[anchoredEnd].originalIndex,
        visibleLineCount: anchoredEnd - anchoredStart + 1,
        highlightStartIndex: visibleLines[Math.max(anchoredStart, highlightStart)].originalIndex,
        sharedLineIndices,
      });
      break;
    }

    // Normal verse - full N lines
    const highlightStart = maxShownVisibleIndex + 1;

    // Calculate shared line indices (lines that appear in both this verse and the next)
    const sharedLineIndices: number[] = [];
    if (currentVisibleStart <= maxShownVisibleIndex) {
      // There's overlap - add overlapping line indices
      for (let i = currentVisibleStart; i <= Math.min(maxShownVisibleIndex, currentVisibleEnd); i++) {
        sharedLineIndices.push(visibleLines[i].originalIndex);
      }
    }

    verses.push({
      startIndex: visibleLines[currentVisibleStart].originalIndex,
      endIndex: visibleLines[currentVisibleEnd].originalIndex,
      visibleLineCount: N,
      highlightStartIndex: visibleLines[Math.max(currentVisibleStart, highlightStart)].originalIndex,
      sharedLineIndices,
    });

    // Update max shown index
    maxShownVisibleIndex = currentVisibleEnd;

    // Find the overlap point for the next verse
    // We want to start at the last CONTENT (non-empty) line of this verse
    // This ensures the overlap is always visually meaningful
    let overlapStart = currentVisibleEnd;
    while (overlapStart > currentVisibleStart && visibleLines[overlapStart].isEmpty) {
      overlapStart--;
    }

    // Advance to next verse starting from the last content line
    currentVisibleStart = overlapStart;
  }

  return verses;
}

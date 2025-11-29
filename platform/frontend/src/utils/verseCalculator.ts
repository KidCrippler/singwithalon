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
 * Calculate verse ranges for lyrics-only mode.
 * 
 * Additional rules compared to chords mode:
 * - No consecutive empty lines count toward verses
 * - A verse should never start with an empty line (empty lines at verse boundaries go to previous verse)
 * - If the last verse has fewer than linesPerVerse lines, merge it with the previous verse
 * 
 * @param lines - Parsed song lines
 * @param linesPerVerse - Number of lyrics-visible lines per verse (default 8)
 * @returns Array of verse ranges
 */
export function calculateVersesForLyricsMode(lines: ParsedLine[], linesPerVerse: number = 8): VerseRange[] {
  if (lines.length === 0) {
    return [];
  }

  const verses: VerseRange[] = [];
  let currentVerseStart = 0;
  let visibleLineCount = 0;
  let prevWasEmpty = false;
  // Track if we've seen any non-empty lyrics line yet (to skip leading empties)
  let seenNonEmptyLyrics = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!isLyricsVisible(line)) {
      // Chord/directive lines don't count but stay with current verse
      continue;
    }
    
    // Handle empty lines
    if (line.type === 'empty') {
      if (prevWasEmpty) {
        // Skip consecutive empty lines - don't count them
        // If at verse start, advance currentVerseStart so this line isn't in any verse's range
        if (visibleLineCount === 0) {
          currentVerseStart = i + 1;
        }
        // If mid-verse, this line is in the current verse range but filter will also skip it
        continue;
      }
      prevWasEmpty = true;
      
      // Skip leading empty lines at the start of the song
      if (!seenNonEmptyLyrics) {
        currentVerseStart = i + 1;
        continue;
      }
      
      // A verse should never START with an empty line
      // If we're at the start of a verse (visibleLineCount == 0), 
      // add this empty to the previous verse instead
      if (visibleLineCount === 0 && verses.length > 0) {
        // Extend previous verse to include this empty line
        verses[verses.length - 1].endIndex = i;
        verses[verses.length - 1].visibleLineCount++;
        currentVerseStart = i + 1;
        continue;
      }
      
      // Normal case: count this empty line
      visibleLineCount++;
      
      // Check if we've reached the verse limit
      if (visibleLineCount >= linesPerVerse) {
        verses.push({
          startIndex: currentVerseStart,
          endIndex: i,
          visibleLineCount,
        });
        currentVerseStart = i + 1;
        visibleLineCount = 0;
      }
      continue;
    }
    
    // Non-empty lyrics line
    prevWasEmpty = false;
    seenNonEmptyLyrics = true;
    visibleLineCount++;
    
    // Check if we've reached the verse limit
    if (visibleLineCount >= linesPerVerse) {
      verses.push({
        startIndex: currentVerseStart,
        endIndex: i,
        visibleLineCount,
      });
      currentVerseStart = i + 1;
      visibleLineCount = 0;
    }
  }

  // Handle remaining lines (last verse may be incomplete)
  // visibleLineCount already tracks how many lines we've counted for this verse
  if (currentVerseStart < lines.length && visibleLineCount > 0) {
    verses.push({
      startIndex: currentVerseStart,
      endIndex: lines.length - 1,
      visibleLineCount,
    });
  }
  
  // NOTE: We do NOT merge undersized last verse. Instead, when displaying,
  // we pad it with lines from the previous verse (see getVerseLinesForDisplay)
  
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
 * Get lines for displaying a verse in lyrics mode, with padding for undersized last verse.
 * 
 * When the last verse has fewer than linesPerVerse visible lines, we prepend lines
 * from the previous verse to fill up to linesPerVerse. This ensures viewers always
 * see a full screen of content, even on the last verse.
 * 
 * @param lines - All parsed song lines
 * @param verses - Array of all verse ranges
 * @param verseIndex - Index of the verse to display
 * @param linesPerVerse - Target number of lines per verse
 * @returns Array of filtered lines for display
 */
export function getVerseLinesForDisplay(
  lines: ParsedLine[],
  verses: VerseRange[],
  verseIndex: number,
  linesPerVerse: number = 8
): ParsedLine[] {
  if (verses.length === 0 || verseIndex < 0 || verseIndex >= verses.length) {
    return [];
  }
  
  const verse = verses[verseIndex];
  const isLastVerse = verseIndex === verses.length - 1;
  
  // Get the verse lines filtered for lyrics mode
  const verseLines = getVerseLines(lines, verse, true);
  
  // If not the last verse, or if it has enough lines, return as-is
  if (!isLastVerse || verseLines.length >= linesPerVerse) {
    return verseLines;
  }
  
  // Last verse is undersized - pad with lines from previous verse
  const linesToAdd = linesPerVerse - verseLines.length;
  
  if (verseIndex === 0) {
    // First (and only) verse - can't pad, just return what we have
    return verseLines;
  }
  
  // Get lines from the previous verse
  const prevVerse = verses[verseIndex - 1];
  const prevVerseLines = getVerseLines(lines, prevVerse, true);
  
  // Take the last N lines from the previous verse
  const paddingLines = prevVerseLines.slice(-linesToAdd);
  
  // Prepend padding to current verse
  return [...paddingLines, ...verseLines];
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

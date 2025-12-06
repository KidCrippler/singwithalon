import type { ParsedLine } from '../types';

/**
 * Line with its original index for proper verse highlighting
 */
export interface IndexedLine {
  line: ParsedLine;
  originalIndex: number;
}

/**
 * Group parsed lines into sections (verses) separated by empty lines or directives/cues.
 * Used for displaying songs in a multi-column layout.
 * 
 * @param lines - Array of parsed lines from the song
 * @param showChords - Whether to include chord lines (false = lyrics-only mode)
 * @returns Array of sections, each containing an array of lines
 */
export function groupIntoSections(
  lines: ParsedLine[],
  showChords: boolean
): ParsedLine[][] {
  const sections: ParsedLine[][] = [];
  let currentSection: ParsedLine[] = [];

  for (const line of lines) {
    // In lyrics mode, skip {} directives and chord-only lines
    // But keep [] cues (they show in both modes)
    if (!showChords) {
      if (line.type === 'directive' || line.type === 'chords') continue;
    }

    // Empty line marks end of section
    if (line.type === 'empty') {
      if (currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
      continue;
    }

    // Directive or cue starts a new section
    if (line.type === 'directive' || line.type === 'cue') {
      if (currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
    }

    currentSection.push(line);
  }

  // Don't forget the last section
  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Group parsed lines into sections while tracking original line indices.
 * Useful when you need to map back to the original line positions (e.g., for verse highlighting).
 * 
 * @param lines - Array of parsed lines from the song
 * @param showChords - Whether to include chord lines (false = lyrics-only mode)
 * @returns Array of sections, each containing indexed lines with original positions
 */
export function groupIntoSectionsWithIndices(
  lines: ParsedLine[],
  showChords: boolean
): IndexedLine[][] {
  const sections: IndexedLine[][] = [];
  let currentSection: IndexedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // In lyrics mode, skip {} directives and chord-only lines
    if (!showChords) {
      if (line.type === 'directive' || line.type === 'chords') continue;
    }

    // Empty line marks end of section
    if (line.type === 'empty') {
      if (currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
      continue;
    }

    // Directive or cue starts a new section
    if (line.type === 'directive' || line.type === 'cue') {
      if (currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
    }

    currentSection.push({ line, originalIndex: i });
  }

  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}


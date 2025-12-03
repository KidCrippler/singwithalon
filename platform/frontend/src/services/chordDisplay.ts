/**
 * Chord Display Formatting Service
 * 
 * Handles formatting chords for rendering (separate from transposition).
 * Should be called as the final step before rendering.
 */

/**
 * Format a chord line for display.
 * Converts 'o' and 'º' to '°' for diminished chords (more elegant notation).
 * 
 * In chord lines, 'o' only appears as the diminished marker (e.g., Fo7, Bo),
 * so a simple character replacement is sufficient.
 * 
 * Note: We also normalize 'º' (U+00BA masculine ordinal indicator) to '°' (U+00B0 degree sign)
 * since these characters look similar and users may type either one.
 */
export function formatChordLineForDisplay(line: string): string {
  return line.replaceAll('o', '°').replaceAll('º', '°');
}

/**
 * Represents a segment within a chord line - either chord content or a directive.
 */
export interface ChordLineSegment {
  type: 'chord' | 'directive';
  text: string;
}

/**
 * Parse a chord line into segments, separating inline directives from chord content.
 * Inline directives are wrapped in {} like {אקפלה} or {Intro}.
 * 
 * @param line - The chord line (already transposed and formatted)
 * @returns Array of segments with type and text
 */
export function segmentChordLine(line: string): ChordLineSegment[] {
  const segments: ChordLineSegment[] = [];
  const regex = /(\{[^}]+\})/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(line)) !== null) {
    // Add chord content before this directive
    if (match.index > lastIndex) {
      segments.push({
        type: 'chord',
        text: line.slice(lastIndex, match.index),
      });
    }
    
    // Add the directive (extract content without braces)
    segments.push({
      type: 'directive',
      text: match[1].slice(1, -1), // Remove { and }
    });
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining chord content after last directive
  if (lastIndex < line.length) {
    segments.push({
      type: 'chord',
      text: line.slice(lastIndex),
    });
  }
  
  // If no directives found, return the whole line as chord
  if (segments.length === 0) {
    segments.push({
      type: 'chord',
      text: line,
    });
  }
  
  return segments;
}


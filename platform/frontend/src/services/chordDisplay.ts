/**
 * Chord Display Formatting Service
 * 
 * Handles formatting chords for rendering (separate from transposition).
 * Should be called as the final step before rendering.
 */

/**
 * Format a chord line for display.
 * Converts 'o' to '°' for diminished chords (more elegant notation).
 * 
 * In chord lines, 'o' only appears as the diminished marker (e.g., Fo7, Bo),
 * so a simple character replacement is sufficient.
 */
export function formatChordLineForDisplay(line: string): string {
  return line.replaceAll('o', '°');
}


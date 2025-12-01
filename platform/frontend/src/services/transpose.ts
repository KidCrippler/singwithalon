/**
 * Chord Transposition and Display Service
 * 
 * Two separate concerns:
 * 1. TRANSPOSITION: Moving chords by semitones with proper enharmonic handling
 *    - Original notation preserved when offset = 0
 *    - Preferred notation used when transposition creates a new accidental
 * 
 * 2. DISPLAY FORMATTING: Converting notation for rendering
 *    - Converts 'o' to '°' for diminished chords (more elegant)
 *    - Should be called as the final step before rendering
 */

// Chromatic scale using preferred enharmonics
// Index 0 = C, 1 = C#, 2 = D, etc.
const CHROMATIC_SCALE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Map all note names (including enharmonics) to semitone index
const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'E#': 5, 'Fb': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'B#': 0, 'Cb': 11,
};

// Valid note letters
const NOTE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export interface ParsedChord {
  root: string;           // e.g., 'A', 'Bb', 'F#'
  accidental: string;     // '', '#', or 'b'
  modifiers: string;      // e.g., 'm', 'maj7', 'dim', '7', 'sus4', etc.
  bass: string | null;    // e.g., 'C#' for A/C#, null if no bass note
  bassAccidental: string; // '', '#', or 'b' for bass note
  original: string;       // The original chord string
}

/**
 * Parse a chord string into its components.
 * Returns null if the string is not a valid chord.
 */
export function parseChord(chord: string): ParsedChord | null {
  if (!chord || chord.length === 0) return null;
  
  // Handle bracketed chords like [Am] or [/A]
  let workingChord = chord;
  if (chord.startsWith('[') && chord.endsWith(']')) {
    workingChord = chord.slice(1, -1);
  }
  
  // Handle bass-only notation like /F or /Bb
  if (workingChord.startsWith('/')) {
    const bassNote = workingChord.slice(1);
    if (!isValidNote(bassNote)) return null;
    
    const bassAccidental = bassNote.length > 1 ? bassNote[1] : '';
    return {
      root: '',
      accidental: '',
      modifiers: '',
      bass: bassNote,
      bassAccidental,
      original: chord,
    };
  }
  
  // Must start with a valid note letter
  if (!NOTE_LETTERS.includes(workingChord[0])) return null;
  
  let index = 1;
  let accidental = '';
  
  // Check for accidental
  if (workingChord[index] === '#' || workingChord[index] === 'b') {
    accidental = workingChord[index];
    index++;
  }
  
  const root = workingChord[0] + accidental;
  
  // Find bass note if present
  let bass: string | null = null;
  let bassAccidental = '';
  const slashIndex = workingChord.indexOf('/', index);
  
  let modifierEnd = slashIndex >= 0 ? slashIndex : workingChord.length;
  
  // Remove trailing ! if present (accent marker)
  if (workingChord.endsWith('!') && slashIndex < 0) {
    modifierEnd--;
  }
  
  const modifiers = workingChord.slice(index, modifierEnd);
  
  if (slashIndex >= 0) {
    let bassStr = workingChord.slice(slashIndex + 1);
    if (bassStr.endsWith('!')) {
      bassStr = bassStr.slice(0, -1);
    }
    if (!isValidNote(bassStr)) return null;
    bass = bassStr;
    bassAccidental = bassStr.length > 1 ? bassStr[1] : '';
  }
  
  return {
    root,
    accidental,
    modifiers,
    bass,
    bassAccidental,
    original: chord,
  };
}

/**
 * Check if a string is a valid note (A-G with optional accidental)
 */
function isValidNote(note: string): boolean {
  if (!note || note.length === 0 || note.length > 2) return false;
  if (!NOTE_LETTERS.includes(note[0])) return false;
  if (note.length === 2 && note[1] !== '#' && note[1] !== 'b') return false;
  return true;
}

/**
 * Transpose a single note by the given number of semitones.
 * Uses the preferred enharmonic spelling.
 */
function transposeNote(note: string, semitones: number): string {
  const currentSemitone = NOTE_TO_SEMITONE[note];
  if (currentSemitone === undefined) return note;
  
  // Calculate new semitone (handle negative values correctly)
  let newSemitone = (currentSemitone + semitones) % 12;
  if (newSemitone < 0) newSemitone += 12;
  
  return CHROMATIC_SCALE[newSemitone];
}

/**
 * Transpose a chord by the given number of semitones.
 * Handles enharmonic preferences: original preserved at offset=0, 
 * preferred notation used for new accidentals.
 * 
 * Note: This function does NOT format for display (e.g., o→°).
 * Use formatChordForDisplay() after transposition for rendering.
 */
export function transposeChord(chord: string, semitones: number): string {
  const parsed = parseChord(chord);
  if (!parsed) return chord;
  
  // Handle brackets
  const hasBrackets = chord.startsWith('[') && chord.endsWith(']');
  const hasExclamation = chord.endsWith('!') || (hasBrackets && chord.endsWith('!]'));
  
  // Handle bass-only notation
  if (parsed.root === '') {
    if (parsed.bass) {
      const newBass = semitones === 0 ? parsed.bass : transposeNote(parsed.bass, semitones);
      let result = '/' + newBass;
      if (hasBrackets) result = '[' + result + ']';
      return result;
    }
    return chord;
  }
  
  // Transpose root
  const newRoot = semitones === 0 ? parsed.root : transposeNote(parsed.root, semitones);
  
  // Transpose bass if present
  let newBass = '';
  if (parsed.bass) {
    const transposedBass = semitones === 0 ? parsed.bass : transposeNote(parsed.bass, semitones);
    newBass = '/' + transposedBass;
  }
  
  // Build result (preserve modifiers as-is, no display formatting here)
  let result = newRoot + parsed.modifiers + newBass;
  
  // Add back exclamation if present
  if (hasExclamation && !result.endsWith('!')) {
    result += '!';
  }
  
  // Add back brackets if present
  if (hasBrackets) {
    result = '[' + result + ']';
  }
  
  return result;
}

/**
 * Check if a token is a chord (vs a special marker like arrows, x, digits, etc.)
 */
function isChordToken(token: string): boolean {
  // Special markers that are NOT chords
  if (token === '-' || token === '[]' || token === 'x') return false;
  if (/^\d+$/.test(token)) return false;
  if (/^(-{2,3}>|<-{2,3})$/.test(token)) return false;
  
  // Handle parenthesized content - could contain a chord
  if (token.startsWith('(') || token.endsWith(')')) {
    // Extract the chord part
    const inner = token.replace(/^\(|\)$/g, '');
    if (inner.length === 0) return false;
    return parseChord(inner) !== null;
  }
  
  return parseChord(token) !== null;
}

/**
 * Transpose a single token (handling parentheses).
 */
function transposeToken(token: string, semitones: number): string {
  const leadingParen = token.startsWith('(') ? '(' : '';
  const trailingParen = token.endsWith(')') ? ')' : '';
  const inner = token.slice(leadingParen.length, token.length - trailingParen.length || undefined);
  
  if (isChordToken(inner)) {
    return leadingParen + transposeChord(inner, semitones) + trailingParen;
  }
  
  if (isChordToken(token)) {
    return transposeChord(token, semitones);
  }
  
  return token;
}

/**
 * Transpose all chords in a chord line by the given number of semitones.
 * Each chord starts at the same position as in the original line.
 * Spacing is adjusted to maintain alignment.
 * 
 * Note: This function does NOT format for display (e.g., o→°).
 * Use formatChordLineForDisplay() after transposition for rendering.
 */
export function transposeChordLine(line: string, semitones: number): string {
  // Find all tokens with their positions
  const tokens: { start: number; original: string; transposed: string }[] = [];
  const regex = /\S+/g;
  let match;
  
  while ((match = regex.exec(line)) !== null) {
    tokens.push({
      start: match.index,
      original: match[0],
      transposed: transposeToken(match[0], semitones),
    });
  }
  
  if (tokens.length === 0) return line;
  
  // Rebuild the line maintaining original start positions
  let result = '';
  let currentPos = 0;
  
  for (const token of tokens) {
    // Add spacing to reach the original start position
    const spacesNeeded = token.start - currentPos;
    if (spacesNeeded > 0) {
      result += ' '.repeat(spacesNeeded);
      currentPos += spacesNeeded;
    }
    
    // Add the transposed token
    result += token.transposed;
    currentPos += token.transposed.length;
  }
  
  // Preserve trailing whitespace from original line
  const lastToken = tokens[tokens.length - 1];
  const originalEnd = lastToken.start + lastToken.original.length;
  if (originalEnd < line.length) {
    result += line.slice(originalEnd);
  }
  
  return result;
}

/**
 * Format offset for display (e.g., 0, +1, -2)
 */
export function formatOffset(offset: number): string {
  if (offset === 0) return '0';
  return offset > 0 ? `+${offset}` : `${offset}`;
}


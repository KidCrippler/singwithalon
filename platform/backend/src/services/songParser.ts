import type { ParsedLine } from '../types/index.js';

export function stripDirectionalChars(text: string): string {
  // Remove: RTL Mark (U+200F), LTR Mark (U+200E), Arabic Letter Mark (U+061C),
  // Directional isolates (U+2066-U+2069), Directional formatting (U+202A-U+202E)
  return text.replace(/[‎‏؜⁦-⁩‪-‮]/g, '');
}

export function detectDirection(text: string, override?: 'ltr' | 'rtl'): 'ltr' | 'rtl' {
  if (override) return override;
  const hebrewMatches = text.match(/[֐-׿]/g);
  return (hebrewMatches?.length ?? 0) > 10 ? 'rtl' : 'ltr';
}

export function isDirective(line: string): boolean {
  const cleaned = stripDirectionalChars(line).trim();
  return cleaned.startsWith('{') && cleaned.endsWith('}');
}

/**
 * Check if line is a cue (square brackets containing non-chord text like [פזמון]).
 * Distinct from bracketed chords like [Am] or multi-token lines like "[]  [E]".
 */
export function isCue(line: string): boolean {
  const cleaned = stripDirectionalChars(line).trim();
  if (!cleaned.startsWith('[') || !cleaned.endsWith(']')) return false;

  const content = cleaned.slice(1, -1).trim();
  if (content.length === 0) return false;

  // Inner brackets mean this is a multi-token chord line, not a single cue label
  if (content.includes('[') || content.includes(']')) return false;

  // Chord-like content (starts with A-G or /) is not a cue
  if (/^[A-G\/]/.test(content)) return false;

  return true;
}

export function extractDirectiveText(line: string): string {
  const cleaned = stripDirectionalChars(line).trim();
  return cleaned.slice(1, -1); // Remove { } or [ ]
}

// Chord detection regex
// Supports: Am, G7, Cmaj7, BbMaj7, CM7, Bm7b5, F#dim, Dsus4, B7sus4, Asus4, Eadd9, A/C#, Fo7, B°7, Am!, [Em], G+, D7+, etc.
// Augmented indicator (+) can appear before or after extension: C+ or C7+ or C+7
// Suspension modifiers (sus, sus2, sus4) come after extension numbers to support chords like B7sus4
// Note: Both ° (U+00B0 degree sign) and º (U+00BA masculine ordinal) are accepted for diminished
export const CHORD_REGEX = /^[A-G][#b]?(m|M|[Mm]aj|[Mm]in|dim|aug|add|o|°|º|\+)?[0-9]*\+?(sus[24]?)?(b[0-9]+)?(\/[A-G][#b]?)?!?$/;

// Matches chords wrapped in square brackets like [Em] or [Am7] or [BbMaj7] or [B7sus4] or [D7+]
export const BRACKETED_CHORD_REGEX = /^\[[A-G][#b]?(m|M|[Mm]aj|[Mm]in|dim|aug|add|o|°|º|\+)?[0-9]*\+?(sus[24]?)?(b[0-9]+)?(\/[A-G][#b]?)?\]!?$/;

// Matches bass-only notation like /F, /Bb, /A, /F#
export const BASS_ONLY_REGEX = /^\/[A-G][#b]?$/;

// Matches bracketed bass-only notation like [/A], [/F#], [/Bb]
export const BRACKETED_BASS_ONLY_REGEX = /^\[\/[A-G][#b]?\]$/;

// Arrow/continuation markers: --->, -->, <---, <--
export const ARROW_REGEX = /^(-{2,3}>|<-{2,3})$/;

// Matches inline directives like {אקפלה} or {Brass Solo} within chord lines
const INLINE_DIRECTIVE_REGEX = /^\{[^}]+\}$/;

export function isValidChordToken(token: string): boolean {
  if (ARROW_REGEX.test(token)) return true;
  if (token === '-') return true;
  if (token === '[]') return true;
  if (token === 'x' || /^\d+$/.test(token) || /^x\d+$/i.test(token)) return true;
  if (token.startsWith('(') || token.endsWith(')')) return true;
  if (INLINE_DIRECTIVE_REGEX.test(token)) return true;
  if (BRACKETED_CHORD_REGEX.test(token)) return true;
  if (BASS_ONLY_REGEX.test(token)) return true;
  if (BRACKETED_BASS_ONLY_REGEX.test(token)) return true;
  return CHORD_REGEX.test(token);
}

export function isChordLine(line: string): boolean {
  const cleaned = stripDirectionalChars(line).trim();
  const tokens = cleaned.split(/\s+/);
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === '')) return false;
  return tokens.every(isValidChordToken);
}

function flipArrow(arrow: string): string {
  if (arrow.startsWith('<')) return arrow.slice(1) + '>';
  if (arrow.endsWith('>')) return '<' + arrow.slice(0, -1);
  return arrow;
}

/**
 * Reverse a chord line for RTL display.
 * Algorithm:
 * 1. Reverse the entire string character by character
 * 2. For each token, reverse it back to restore chord names
 * 3. For tokens with unbalanced brackets, move bracket to opposite side and swap type
 * 4. For arrow tokens, flip their direction (---> becomes <---, etc.)
 */
export function reverseChordLineForRtl(line: string): string {
  const reversed = line.split('').reverse().join('');

  return reversed.replace(/\S+/g, (token) => {
    // Special handling for {} directives
    // After line reversal, {אקפלה} becomes }הלפקא{ and {Intro} becomes }ortnI{
    if (token.startsWith('}') && token.endsWith('{')) {
      const content = token.slice(1, -1);
      const hasHebrew = /[֐-׿]/.test(content);
      if (hasHebrew) {
        return '{' + content + '}';
      } else {
        return '{' + content.split('').reverse().join('') + '}';
      }
    }

    let result = token.split('').reverse().join('');

    if (ARROW_REGEX.test(result)) return flipArrow(result);

    const startsWithOpen = result.startsWith('(') || result.startsWith('[');
    const endsWithClose = result.endsWith(')') || result.endsWith(']');
    if (startsWithOpen && endsWithClose) return result;

    if (result.startsWith('(')) result = result.slice(1) + ')';
    else if (result.startsWith('[')) result = result.slice(1) + ']';
    else if (result.endsWith(')')) result = '(' + result.slice(0, -1);
    else if (result.endsWith(']')) result = '[' + result.slice(0, -1);

    return result;
  });
}

/**
 * Parse a single song body line into a ParsedLine.
 * Caller is responsible for stripping/cleaning before passing `line`.
 */
export function parseLine(line: string, isRtl: boolean): ParsedLine {
  const cleanedLine = stripDirectionalChars(line);
  const trimmed = cleanedLine.trim();

  if (trimmed === '') return { type: 'empty', text: '' };

  if (isDirective(trimmed)) return { type: 'directive', text: extractDirectiveText(trimmed) };

  if (isCue(trimmed)) return { type: 'cue', text: extractDirectiveText(trimmed) };

  if (isChordLine(trimmed)) {
    const chordLine = isRtl ? reverseChordLineForRtl(cleanedLine.trimEnd()) : cleanedLine.trimEnd();
    return { type: 'chords', text: chordLine, raw: chordLine };
  }

  return { type: 'lyric', text: cleanedLine.trimEnd() };
}

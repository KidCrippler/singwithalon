import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ParsedSong, ParsedLine } from '../types/index.js';

/**
 * Tools routes - utility endpoints for development/admin tools
 * These endpoints are not room-scoped and require no authentication
 */
export async function toolsRoutes(fastify: FastifyInstance) {
  
  /**
   * Parse chord sheet markup text into structured format
   * Used by the sandbox tool for real-time preview
   * 
   * POST /api/tools/parse-markup
   * Body: Raw text content (Content-Type: text/plain)
   * Returns: ParsedSong JSON
   */
  fastify.post('/api/tools/parse-markup', {
    config: {
      rawBody: true,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Get raw text body
    const text = request.body as string;
    
    if (!text || typeof text !== 'string') {
      return reply.status(400).send({ error: 'Request body must be text' });
    }
    
    try {
      const parsed = parseSongMarkup(text);
      return parsed;
    } catch (error) {
      console.error('Failed to parse markup:', error);
      return reply.status(500).send({ error: 'Failed to parse markup' });
    }
  });
}

/**
 * Parse song markup text into structured format.
 * This is a standalone version for the sandbox - it extracts all metadata from the text itself.
 */
function parseSongMarkup(text: string): ParsedSong {
  const lines = text.split('\n');
  const parsedLines: ParsedLine[] = [];
  
  // Parse metadata from first lines
  let title = '';
  let artist = '';
  let credits = '';
  let metadataEnded = false;
  let lineIndex = 0;

  // Try to extract metadata from the beginning
  for (let i = 0; i < lines.length && !metadataEnded; i++) {
    const line = stripDirectionalChars(lines[i]).trim();
    
    if (line === '') {
      metadataEnded = true;
      lineIndex = i + 1;
      continue;
    }

    // Check for title line: "Song Title - Artist" or "Song Title – Artist" (en-dash)
    if (i === 0 && (line.includes(' - ') || line.includes(' – '))) {
      const separator = line.includes(' - ') ? ' - ' : ' – ';
      const [t, a] = line.split(separator);
      if (t) title = stripDirectionalChars(t).trim();
      if (a) artist = stripDirectionalChars(a).trim();
      lineIndex = i + 1;
    } else if (line.match(/^(מילים|לחן|תרגום|Lyrics|Music|Translation|מילים ולחן|Lyrics and Music)/i)) {
      // Accumulate credits (there might be multiple lines)
      if (credits) {
        credits += '   ' + line;
      } else {
        credits = line;
      }
      lineIndex = i + 1;
    }
  }

  // Detect direction from content
  const direction = detectDirection(text);
  const isRtl = direction === 'rtl';

  // Parse remaining lines
  for (let i = lineIndex; i < lines.length; i++) {
    const line = lines[i];
    // Strip directional control chars early
    const cleanedLine = stripDirectionalChars(line);
    const trimmed = cleanedLine.trim();

    if (trimmed === '') {
      parsedLines.push({ type: 'empty', text: '' });
    } else if (isDirective(trimmed)) {
      // {} directives - shown in green in chords mode only
      parsedLines.push({ type: 'directive', text: extractDirectiveText(trimmed) });
    } else if (isCue(trimmed)) {
      // [] cues - shown in red in both modes
      parsedLines.push({ type: 'cue', text: extractDirectiveText(trimmed) });
    } else if (isChordLine(trimmed)) {
      // For RTL songs, reverse chord lines so they display correctly
      const chordLine = isRtl ? reverseChordLineForRtl(cleanedLine.trimEnd()) : cleanedLine.trimEnd();
      parsedLines.push({ type: 'chords', text: chordLine, raw: chordLine });
    } else {
      parsedLines.push({ type: 'lyric', text: cleanedLine.trimEnd() });
    }
  }

  return {
    metadata: {
      title: title || 'ללא כותרת',
      artist: artist || '',
      credits,
      direction,
    },
    lines: parsedLines,
  };
}

function detectDirection(text: string): 'ltr' | 'rtl' {
  // Count Hebrew characters
  const hebrewRegex = /[\u0590-\u05FF]/g;
  const hebrewMatches = text.match(hebrewRegex);
  const hebrewCount = hebrewMatches?.length ?? 0;
  
  // If significant Hebrew content, use RTL
  return hebrewCount > 10 ? 'rtl' : 'ltr';
}

/**
 * Strip Unicode directional control characters that interfere with parsing.
 */
function stripDirectionalChars(text: string): string {
  return text.replace(/[\u200E\u200F\u061C\u2066-\u2069\u202A-\u202E]/g, '');
}

function isDirective(line: string): boolean {
  const cleaned = stripDirectionalChars(line).trim();
  return cleaned.startsWith('{') && cleaned.endsWith('}');
}

/**
 * Check if line is a cue (square brackets with non-chord content like [פזמון])
 */
function isCue(line: string): boolean {
  const cleaned = stripDirectionalChars(line).trim();
  if (!cleaned.startsWith('[') || !cleaned.endsWith(']')) return false;
  
  const content = cleaned.slice(1, -1).trim();
  if (content.length === 0) return false;
  
  // If the content looks like a chord, it's NOT a cue
  if (/^[A-G\/]/.test(content)) return false;
  
  return true;
}

function extractDirectiveText(line: string): string {
  const cleaned = stripDirectionalChars(line).trim();
  return cleaned.slice(1, -1); // Remove { } or [ ]
}

// Chord detection patterns
// Suspension modifiers (sus, sus2, sus4) come after extension numbers to support chords like B7sus4, Asus4
const CHORD_REGEX = /^[A-G][#b]?(m|M|[Mm]aj|[Mm]in|dim|aug|add|o|°|º|\+)?[0-9]*(sus[24]?)?(b[0-9]+)?(\/[A-G][#b]?)?!?$/;
const BRACKETED_CHORD_REGEX = /^\[[A-G][#b]?(m|M|[Mm]aj|[Mm]in|dim|aug|add|o|°|º|\+)?[0-9]*(sus[24]?)?(b[0-9]+)?(\/[A-G][#b]?)?\]!?$/;
const BASS_ONLY_REGEX = /^\/[A-G][#b]?$/;
const BRACKETED_BASS_ONLY_REGEX = /^\[\/[A-G][#b]?\]$/;
const ARROW_REGEX = /^(-{2,3}>|<-{2,3})$/;
const INLINE_DIRECTIVE_REGEX = /^\{[^}]+\}$/;

function isValidChordToken(token: string): boolean {
  if (ARROW_REGEX.test(token)) return true;
  if (token === '-') return true;
  if (token === '[]') return true;
  if (token === 'x' || /^\d+$/.test(token)) return true;
  if (token.startsWith('(') || token.endsWith(')')) return true;
  if (INLINE_DIRECTIVE_REGEX.test(token)) return true;
  if (BRACKETED_CHORD_REGEX.test(token)) return true;
  if (BASS_ONLY_REGEX.test(token)) return true;
  if (BRACKETED_BASS_ONLY_REGEX.test(token)) return true;
  return CHORD_REGEX.test(token);
}

function isChordLine(line: string): boolean {
  const cleaned = stripDirectionalChars(line).trim();
  const tokens = cleaned.split(/\s+/);
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === '')) return false;
  
  return tokens.every(isValidChordToken);
}

function flipArrow(arrow: string): string {
  if (arrow.startsWith('<')) {
    return arrow.slice(1) + '>';
  } else if (arrow.endsWith('>')) {
    return '<' + arrow.slice(0, -1);
  }
  return arrow;
}

/**
 * Reverse a chord line for RTL display.
 */
function reverseChordLineForRtl(line: string): string {
  const reversed = line.split('').reverse().join('');
  
  return reversed.replace(/\S+/g, (token) => {
    // Special handling for {} directives
    if (token.startsWith('}') && token.endsWith('{')) {
      const content = token.slice(1, -1);
      const hasHebrew = /[\u0590-\u05FF]/.test(content);
      if (hasHebrew) {
        return '{' + content + '}';
      } else {
        return '{' + content.split('').reverse().join('') + '}';
      }
    }
    
    let result = token.split('').reverse().join('');
    
    if (ARROW_REGEX.test(result)) {
      return flipArrow(result);
    }
    
    const startsWithOpen = result.startsWith('(') || result.startsWith('[');
    const endsWithClose = result.endsWith(')') || result.endsWith(']');
    
    if (startsWithOpen && endsWithClose) {
      return result;
    }
    
    if (result.startsWith('(')) {
      result = result.slice(1) + ')';
    } else if (result.startsWith('[')) {
      result = result.slice(1) + ']';
    } else if (result.endsWith(')')) {
      result = '(' + result.slice(0, -1);
    } else if (result.endsWith(']')) {
      result = '[' + result.slice(0, -1);
    }
    
    return result;
  });
}


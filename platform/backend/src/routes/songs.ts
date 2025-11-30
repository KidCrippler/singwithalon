import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readFileSync, existsSync } from 'fs';
import { requireAdmin } from './auth.js';
import type { Song, ParsedSong } from '../types/index.js';
import { config } from '../config.js';

// In-memory song storage
let songsIndex: Song[] = [];
const lyricsCache = new Map<number, { data: ParsedSong; dateModified: number }>();

export function getSongsIndex(): Song[] {
  return songsIndex;
}

interface SongsJsonResponse {
  version?: string;
  title?: string;
  categories?: { id: string; name: string }[];
  songs: Song[];
}

export async function loadSongsIndex(): Promise<void> {
  // Try local file first if configured
  if (config.songs.localPath) {
    try {
      if (existsSync(config.songs.localPath)) {
        console.log(`Loading songs from local file: ${config.songs.localPath}`);
        const content = readFileSync(config.songs.localPath, 'utf-8');
        const data = JSON.parse(content) as SongsJsonResponse;
        songsIndex = data.songs || [];
        console.log(`Loaded ${songsIndex.length} songs from local file`);
        return;
      } else {
        console.warn(`Local songs file not found: ${config.songs.localPath}`);
      }
    } catch (error) {
      console.error('Failed to load songs from local file:', error);
    }
  }

  // Fall back to URL
  if (!config.songs.jsonUrl) {
    console.log('No SONGS_JSON_URL configured, starting with empty song list');
    return;
  }

  try {
    console.log(`Fetching songs from ${config.songs.jsonUrl}`);
    const response = await fetch(config.songs.jsonUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch songs: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as SongsJsonResponse;
    // The JSON has songs in a "songs" property
    songsIndex = data.songs || [];
    console.log(`Loaded ${songsIndex.length} songs from URL`);
  } catch (error) {
    console.error('Failed to load songs index:', error);
    // Keep existing songs if reload fails
  }
}

export async function songsRoutes(fastify: FastifyInstance) {
  // Load songs on startup
  fastify.addHook('onReady', async () => {
    await loadSongsIndex();
  });

  // List all songs (filters private for non-admin)
  fastify.get('/api/songs', async (request: FastifyRequest, reply: FastifyReply) => {
    const isAdmin = request.user?.isAdmin ?? false;
    
    const songs = songsIndex
      .filter(song => isAdmin || !song.isPrivate)
      .map(song => ({
        id: song.id,
        name: song.name,
        singer: song.singer,
        categoryIds: song.categoryIds,
        isPrivate: song.isPrivate,
        direction: song.direction,
      }));

    return songs;
  });

  // Get single song metadata
  fastify.get<{ Params: { id: string } }>('/api/songs/:id', async (request, reply) => {
    const songId = parseInt(request.params.id, 10);
    const song = songsIndex.find(s => s.id === songId);

    if (!song) {
      return reply.status(404).send({ error: 'Song not found' });
    }

    const isAdmin = request.user?.isAdmin ?? false;
    if (song.isPrivate && !isAdmin) {
      return reply.status(404).send({ error: 'Song not found' });
    }

    return {
      id: song.id,
      name: song.name,
      singer: song.singer,
      composers: song.composers,
      lyricists: song.lyricists,
      translators: song.translators,
      categoryIds: song.categoryIds,
      isPrivate: song.isPrivate,
      direction: song.direction,
      playback: song.playback,
    };
  });

  // Get song lyrics (parsed)
  fastify.get<{ Params: { id: string } }>('/api/songs/:id/lyrics', async (request, reply) => {
    const songId = parseInt(request.params.id, 10);
    const song = songsIndex.find(s => s.id === songId);

    if (!song) {
      return reply.status(404).send({ error: 'Song not found' });
    }

    const isAdmin = request.user?.isAdmin ?? false;
    if (song.isPrivate && !isAdmin) {
      return reply.status(404).send({ error: 'Song not found' });
    }

    // Check cache
    const cached = lyricsCache.get(songId);
    const songModified = song.dateModified ?? 0;
    
    if (cached && cached.dateModified >= songModified) {
      return cached.data;
    }

    // Fetch and parse lyrics
    try {
      const response = await fetch(song.lyrics.markupUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch lyrics: ${response.status}`);
      }
      
      const text = await response.text();
      const parsed = parseSongMarkup(text, song);
      
      // Cache the result
      lyricsCache.set(songId, {
        data: parsed,
        dateModified: songModified,
      });

      return parsed;
    } catch (error) {
      console.error(`Failed to fetch lyrics for song ${songId}:`, error);
      return reply.status(500).send({ error: 'Failed to load song lyrics' });
    }
  });

  // Reload songs (admin only)
  fastify.post('/api/songs/reload', { preHandler: requireAdmin }, async (request, reply) => {
    await loadSongsIndex();
    // Clear lyrics cache on reload
    lyricsCache.clear();
    return { success: true, count: songsIndex.length };
  });
}

// Song parsing logic (will be expanded in Phase 2)
function parseSongMarkup(text: string, song: Song): ParsedSong {
  const lines = text.split('\n');
  const parsedLines: ParsedSong['lines'] = [];
  
  // Parse metadata from first lines
  let title = song.name;
  let artist = song.singer;
  let credits = '';
  let metadataEnded = false;
  let lineIndex = 0;

  // Try to extract metadata from the beginning
  for (let i = 0; i < lines.length && !metadataEnded; i++) {
    const line = lines[i].trim();
    
    if (line === '') {
      metadataEnded = true;
      lineIndex = i + 1;
      continue;
    }

    if (i === 0 && line.includes(' - ')) {
      // First line: "Song Title - Artist"
      const [t, a] = line.split(' - ');
      if (t) title = t.trim();
      if (a) artist = a.trim();
      lineIndex = i + 1;
    } else if (line.match(/^(מילים|לחן|Lyrics|Music|מילים ולחן|Lyrics and Music)/i)) {
      credits = line;
      lineIndex = i + 1;
    }
  }

  // Detect direction
  const direction = detectDirection(text, song.direction);
  const isRtl = direction === 'rtl';

  // Parse remaining lines
  for (let i = lineIndex; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

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
      // Strip directional chars before reversing to avoid corruption
      const cleanedLine = stripDirectionalChars(line);
      const chordLine = isRtl ? reverseChordLineForRtl(cleanedLine) : cleanedLine;
      parsedLines.push({ type: 'chords', text: chordLine, raw: chordLine });
    } else {
      parsedLines.push({ type: 'lyric', text: line });
    }
  }

  return {
    metadata: {
      title,
      artist,
      credits,
      direction,
    },
    lines: parsedLines,
  };
}

function detectDirection(text: string, override?: 'ltr' | 'rtl'): 'ltr' | 'rtl' {
  if (override) return override;
  
  // Count Hebrew characters
  const hebrewRegex = /[\u0590-\u05FF]/g;
  const hebrewMatches = text.match(hebrewRegex);
  const hebrewCount = hebrewMatches?.length ?? 0;
  
  // If significant Hebrew content, use RTL
  return hebrewCount > 10 ? 'rtl' : 'ltr';
}

/**
 * Strip Unicode directional control characters that interfere with parsing.
 * These include RTL/LTR marks and other invisible formatting characters.
 */
function stripDirectionalChars(text: string): string {
  // Remove: RTL Mark (U+200F), LTR Mark (U+200E), Arabic Letter Mark (U+061C),
  // Directional isolates (U+2066-U+2069), Directional formatting (U+202A-U+202E)
  return text.replace(/[\u200E\u200F\u061C\u2066-\u2069\u202A-\u202E]/g, '');
}

function isDirective(line: string): boolean {
  const cleaned = stripDirectionalChars(line).trim();
  return cleaned.startsWith('{') && cleaned.endsWith('}');
}

/**
 * Check if line is a cue (square brackets with non-chord content like [פזמון])
 * This is different from bracketed chords like [Am] or [/A]
 */
function isCue(line: string): boolean {
  const cleaned = stripDirectionalChars(line).trim();
  if (!cleaned.startsWith('[') || !cleaned.endsWith(']')) return false;
  
  // Extract content inside brackets
  const content = cleaned.slice(1, -1).trim();
  if (content.length === 0) return false;
  
  // If the content is a valid chord token, it's NOT a cue
  // Cues contain non-chord text like Hebrew section names
  // Check if it looks like a chord (starts with A-G or /)
  if (/^[A-G\/]/.test(content)) return false;
  
  return true;
}

/**
 * Extract directive text, stripping directional characters
 */
function extractDirectiveText(line: string): string {
  const cleaned = stripDirectionalChars(line).trim();
  return cleaned.slice(1, -1); // Remove { } or [ ]
}

// Chord detection regex - matches common chord patterns
// Supports: Am, G7, Cmaj7, BbMaj7, CM7, Bm7b5, F#dim, Dsus4, Eadd9, A/C#, Fo7, Am!, [Em], etc.
// Quality can be: m (minor), M/Maj/maj (major), min, dim, aug, sus2/4, add, o (dim), + (aug)
const CHORD_REGEX = /^[A-G][#b]?(m|M|[Mm]aj|[Mm]in|dim|aug|sus[24]?|add|o|\+)?[0-9]*(b[0-9]+)?(\/[A-G][#b]?)?!?$/;

// Matches chords wrapped in square brackets like [Em] or [Am7] or [BbMaj7]
const BRACKETED_CHORD_REGEX = /^\[[A-G][#b]?(m|M|[Mm]aj|[Mm]in|dim|aug|sus[24]?|add|o|\+)?[0-9]*(b[0-9]+)?(\/[A-G][#b]?)?\]!?$/;

// Matches bass-only notation like /F, /Bb, /A, /F# (just a slash followed by a note)
const BASS_ONLY_REGEX = /^\/[A-G][#b]?$/;

// Matches bracketed bass-only notation like [/A], [/F#], [/Bb]
const BRACKETED_BASS_ONLY_REGEX = /^\[\/[A-G][#b]?\]$/;

// Arrow/continuation markers - can point left or right, with 2 or 3 hyphens
// Valid: --->, -->, <---, <--
const ARROW_REGEX = /^(-{2,3}>|<-{2,3})$/;

/**
 * Check if a token is a valid chord token.
 * Exported for testing purposes.
 */
export function isValidChordToken(token: string): boolean {
  // Handle continuation markers (arrows pointing either direction, 2 or 3 hyphens)
  // Valid: --->, -->, <---, <--
  if (ARROW_REGEX.test(token)) return true;
  // Handle single hyphen (used as separator between chords)
  if (token === '-') return true;
  // Handle empty brackets (placeholder/rest marker)
  if (token === '[]') return true;
  // Handle repeat notation: 'x' and digits like '2', '3', '4'
  if (token === 'x' || /^\d+$/.test(token)) return true;
  // Handle parenthesized tokens (opening or closing parens in chord progressions)
  if (token.startsWith('(') || token.endsWith(')')) return true;
  // Test against bracketed chord regex (e.g., [Em], [Am7])
  if (BRACKETED_CHORD_REGEX.test(token)) return true;
  // Test against bass-only notation (e.g., /F, /Bb, /A)
  if (BASS_ONLY_REGEX.test(token)) return true;
  // Test against bracketed bass-only notation (e.g., [/A], [/F#])
  if (BRACKETED_BASS_ONLY_REGEX.test(token)) return true;
  // Test against standard chord regex (including chords with !)
  return CHORD_REGEX.test(token);
}

function isChordLine(line: string): boolean {
  // Strip directional control characters before checking
  const cleaned = stripDirectionalChars(line).trim();
  const tokens = cleaned.split(/\s+/);
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === '')) return false;
  
  // Check if ALL tokens are valid chords or special markers
  return tokens.every(isValidChordToken);
}

/**
 * Flip an arrow's direction: ---> becomes <---, --> becomes <--, etc.
 */
function flipArrow(arrow: string): string {
  if (arrow.startsWith('<')) {
    // Left-pointing to right-pointing: <--- → --->, <-- → -->
    return arrow.slice(1) + '>';
  } else if (arrow.endsWith('>')) {
    // Right-pointing to left-pointing: ---> → <---, --> → <--
    return '<' + arrow.slice(0, -1);
  }
  return arrow;
}

/**
 * Reverse a chord line for RTL display.
 * Algorithm:
 * 1. Reverse the entire string character by character
 * 2. For each token, reverse it back to restore chord names
 * 3. For tokens with unbalanced brackets, move bracket to opposite side and swap type
 * 4. For arrow tokens, flip their direction (---> becomes <---, etc.)
 * 
 * Example: "   C  G Am  D  Em    Em"
 * Step 1 (reverse all): "mE    mE  D  mA G  C   "
 * Step 2 (reverse tokens): "Em    Em  D  Am G  C   "
 * 
 * Example with parens: "(Cm   Ab   Eb   Bb) x 2"
 * Step 1 (reverse): "2 x )bB   bE   bA   mC("
 * Step 2 (reverse tokens): "2 x Bb)   Eb   Ab   (Cm"
 * Step 3 (fix brackets): "2 x (Bb   Eb   Ab   Cm)"
 * 
 * Example with arrows: "Am --->  G"
 * Step 1 (reverse): "G  >--- mA"
 * Step 2 (reverse tokens): "G  ---> Am"
 * Step 3 (flip arrows): "G  <--- Am"
 * 
 * Exported for testing purposes.
 */
export function reverseChordLineForRtl(line: string): string {
  // Step 1: Reverse the entire string
  const reversed = line.split('').reverse().join('');
  
  // Step 2: For each token, reverse it and fix bracket positions
  return reversed.replace(/\S+/g, (token) => {
    // Reverse the token to restore chord names
    let result = token.split('').reverse().join('');
    
    // Check if this is an arrow token - flip its direction
    if (ARROW_REGEX.test(result)) {
      return flipArrow(result);
    }
    
    // Check if brackets are balanced (at both ends) - if so, leave alone
    const startsWithOpen = result.startsWith('(') || result.startsWith('[');
    const endsWithClose = result.endsWith(')') || result.endsWith(']');
    
    if (startsWithOpen && endsWithClose) {
      // Balanced brackets like (Em) or [Am7] - leave as is
      return result;
    }
    
    // Fix unbalanced bracket positions: move to opposite side and swap type
    // Opening bracket at start → move to end as closing bracket
    if (result.startsWith('(')) {
      result = result.slice(1) + ')';
    } else if (result.startsWith('[')) {
      result = result.slice(1) + ']';
    }
    // Closing bracket at end → move to start as opening bracket
    else if (result.endsWith(')')) {
      result = '(' + result.slice(0, -1);
    } else if (result.endsWith(']')) {
      result = '[' + result.slice(0, -1);
    }
    
    return result;
  });
}



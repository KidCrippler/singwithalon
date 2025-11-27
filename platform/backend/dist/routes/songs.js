import { readFileSync, existsSync } from 'fs';
import { requireAdmin } from './auth.js';
import { config } from '../config.js';
// In-memory song storage
let songsIndex = [];
const lyricsCache = new Map();
export function getSongsIndex() {
    return songsIndex;
}
export async function loadSongsIndex() {
    // Try local file first if configured
    if (config.songs.localPath) {
        try {
            if (existsSync(config.songs.localPath)) {
                console.log(`Loading songs from local file: ${config.songs.localPath}`);
                const content = readFileSync(config.songs.localPath, 'utf-8');
                const data = JSON.parse(content);
                songsIndex = data.songs || [];
                console.log(`Loaded ${songsIndex.length} songs from local file`);
                return;
            }
            else {
                console.warn(`Local songs file not found: ${config.songs.localPath}`);
            }
        }
        catch (error) {
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
        const data = await response.json();
        // The JSON has songs in a "songs" property
        songsIndex = data.songs || [];
        console.log(`Loaded ${songsIndex.length} songs from URL`);
    }
    catch (error) {
        console.error('Failed to load songs index:', error);
        // Keep existing songs if reload fails
    }
}
export async function songsRoutes(fastify) {
    // Load songs on startup
    fastify.addHook('onReady', async () => {
        await loadSongsIndex();
    });
    // List all songs (filters private for non-admin)
    fastify.get('/api/songs', async (request, reply) => {
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
    fastify.get('/api/songs/:id', async (request, reply) => {
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
            categoryIds: song.categoryIds,
            isPrivate: song.isPrivate,
            direction: song.direction,
            playback: song.playback,
        };
    });
    // Get song lyrics (parsed)
    fastify.get('/api/songs/:id/lyrics', async (request, reply) => {
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
        }
        catch (error) {
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
function parseSongMarkup(text, song) {
    const lines = text.split('\n');
    const parsedLines = [];
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
            if (t)
                title = t.trim();
            if (a)
                artist = a.trim();
            lineIndex = i + 1;
        }
        else if (line.match(/^(מילים|לחן|Lyrics|Music|מילים ולחן|Lyrics and Music)/i)) {
            credits = line;
            lineIndex = i + 1;
        }
    }
    // Detect direction
    const direction = detectDirection(text, song.direction);
    // Parse remaining lines
    for (let i = lineIndex; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed === '') {
            parsedLines.push({ type: 'empty', text: '' });
        }
        else if (isDirective(trimmed)) {
            parsedLines.push({ type: 'directive', text: trimmed.slice(1, -1) }); // Remove { }
        }
        else if (isChordLine(trimmed)) {
            parsedLines.push({ type: 'chords', text: line, raw: line }); // Preserve original spacing
        }
        else {
            parsedLines.push({ type: 'lyric', text: line });
        }
    }
    // Calculate verse breaks (default 8 lines per verse)
    const verseBreaks = calculateVerseBreaks(parsedLines);
    return {
        metadata: {
            title,
            artist,
            credits,
            direction,
        },
        lines: parsedLines,
        verseBreaks,
    };
}
function detectDirection(text, override) {
    if (override)
        return override;
    // Count Hebrew characters
    const hebrewRegex = /[\u0590-\u05FF]/g;
    const hebrewMatches = text.match(hebrewRegex);
    const hebrewCount = hebrewMatches?.length ?? 0;
    // If significant Hebrew content, use RTL
    return hebrewCount > 10 ? 'rtl' : 'ltr';
}
function isDirective(line) {
    return line.startsWith('{') && line.endsWith('}');
}
// Chord detection regex - matches common chord patterns
// Supports: Am, G7, Cmaj7, Bm7b5, F#dim, Dsus4, Eadd9, A/C#, Fo7, Am!, [Em], etc.
const CHORD_REGEX = /^[A-G][#b]?(m|maj|min|dim|aug|sus[24]?|add|o|\+)?[0-9]*(b[0-9]+)?(\/[A-G][#b]?)?!?$/;
// Matches chords wrapped in square brackets like [Em] or [Am7]
const BRACKETED_CHORD_REGEX = /^\[[A-G][#b]?(m|maj|min|dim|aug|sus[24]?|add|o|\+)?[0-9]*(b[0-9]+)?(\/[A-G][#b]?)?\]!?$/;
function isChordLine(line) {
    const tokens = line.trim().split(/\s+/);
    if (tokens.length === 0)
        return false;
    // Check if ALL tokens are valid chords or special markers
    return tokens.every(token => {
        // Handle continuation marker
        if (token === '--->')
            return true;
        // Handle single hyphen (used as separator between chords)
        if (token === '-')
            return true;
        // Handle parenthesized chords like (Em) or repeated patterns like (Em A D) x 2
        if (token.startsWith('(') || token.endsWith(')') || token === 'x' || /^\d+$/.test(token))
            return true;
        // Test against bracketed chord regex (e.g., [Em], [Am7])
        if (BRACKETED_CHORD_REGEX.test(token))
            return true;
        // Test against standard chord regex (including chords with !)
        return CHORD_REGEX.test(token);
    });
}
function calculateVerseBreaks(lines, linesPerVerse = 8) {
    const breaks = [0];
    let lyricLineCount = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Count lyric lines and empty lines (but not chord-only or directive lines)
        if (line.type === 'lyric' || line.type === 'empty') {
            lyricLineCount++;
            if (lyricLineCount >= linesPerVerse && i < lines.length - 1) {
                breaks.push(i + 1);
                lyricLineCount = 0;
            }
        }
    }
    return breaks;
}

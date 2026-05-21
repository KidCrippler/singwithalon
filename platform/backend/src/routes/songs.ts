import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { requireAdmin } from './auth.js';
import { syncSongsToDatabase, syncMetadataQueries } from '../db/index.js';
import type { Song, ParsedSong } from '../types/index.js';
import { config } from '../config.js';
import {
  stripDirectionalChars,
  detectDirection,
  isDirective,
  isCue,
  extractDirectiveText,
  isChordLine,
  parseLine,
  reverseChordLineForRtl,
  isValidChordToken,
} from '../services/songParser.js';

export { isValidChordToken, reverseChordLineForRtl };

// In-memory song storage
let songsIndex: Song[] = [];
const lyricsCache = new Map<number, { data: ParsedSong; dateModified: number }>();

// Guard to prevent concurrent syncSongsToDatabase calls
let syncPromise: Promise<void> | null = null;

// Guard to prevent multiple onReady hook registrations per Fastify instance
// Use WeakSet so instances can be garbage collected
const fastifyInstancesWithHook = new WeakSet<FastifyInstance>();

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
  let rawContent: string | null = null;
  let loadedFromLocal = false;

  // Try local file first if configured
  if (config.songs.localPath) {
    try {
      if (existsSync(config.songs.localPath)) {
        console.log(`Loading songs from local file: ${config.songs.localPath}`);
        rawContent = readFileSync(config.songs.localPath, 'utf-8');
        const data = JSON.parse(rawContent) as SongsJsonResponse;
        songsIndex = data.songs || [];
        console.log(`Loaded ${songsIndex.length} songs from local file`);
        loadedFromLocal = true;
      } else {
        console.warn(`Local songs file not found: ${config.songs.localPath}`);
      }
    } catch (error) {
      console.error('Failed to load songs from local file:', error);
    }
  }

  // Fall back to URL if not loaded from local
  if (!loadedFromLocal) {
    if (!config.songs.jsonUrl) {
      console.log('No SONGS_JSON_URL configured, starting with empty song list');
      return;
    }

    // Retry logic for transient network issues
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching songs from ${config.songs.jsonUrl}${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
        const response = await fetch(config.songs.jsonUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch songs: ${response.status} ${response.statusText}`);
        }
        // Get raw text content for hashing
        rawContent = await response.text();
        const data = JSON.parse(rawContent) as SongsJsonResponse;
        // The JSON has songs in a "songs" property
        songsIndex = data.songs || [];
        console.log(`Loaded ${songsIndex.length} songs from URL`);
        break; // Success, exit retry loop
      } catch (error) {
        if (attempt === maxRetries) {
          console.error('Failed to load songs index after all retries:', error);
          // Keep existing songs if reload fails
        } else {
          console.warn(`Fetch attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
  }

  // Sync songs to database if they've changed (hash-based comparison)
  if (songsIndex.length > 0 && rawContent) {
    // Skip sync if already syncing (use Promise to prevent race conditions)
    if (syncPromise) {
      console.log('Sync already in progress, skipping');
      return;
    }

    // Hash the entire raw content (SHA-256)
    const currentHash = createHash('sha256').update(rawContent).digest('hex');

    // Get stored hash from database
    const storedHash = await syncMetadataQueries.get('songs_json_hash');

    // Skip sync if songs haven't changed
    if (storedHash === currentHash) {
      console.log('Songs unchanged (hash match), skipping database sync');
      return;
    }

    console.log('Songs changed detected, syncing to database...');

    // Create the sync promise immediately to prevent race conditions
    syncPromise = syncSongsToDatabase(songsIndex)
      .then(async () => {
        // Store new hash after successful sync
        await syncMetadataQueries.set('songs_json_hash', currentHash);
        console.log('Songs sync complete, hash updated');
      })
      .catch(err => {
        console.error('Background songs sync failed:', err);
      })
      .finally(() => {
        syncPromise = null;
      });
  }
}

export async function songsRoutes(fastify: FastifyInstance) {
  // Prevent multiple onReady hook registrations per Fastify instance
  // This handles cases where the plugin is registered multiple times (e.g., hot-reload)
  if (fastifyInstancesWithHook.has(fastify)) {
    // Still need to register routes, just skip the hook
  } else {
    fastifyInstancesWithHook.add(fastify);
    
    // Load songs on startup
    fastify.addHook('onReady', async () => {
      await loadSongsIndex();
    });
  }

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
        dateCreated: song.dateCreated,
        dateModified: song.dateModified,
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
      dateCreated: song.dateCreated,
      dateModified: song.dateModified,
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
    
    // For private songs, allow access if:
    // 1. User is admin, OR
    // 2. Song is currently being played in any room (admin is presenting it)
    if (song.isPrivate && !isAdmin) {
      const { playingStateQueries } = await import('../db/index.js');
      const isCurrentlyPlaying = await playingStateQueries.isSongCurrentlyPlaying(songId);
      
      if (!isCurrentlyPlaying) {
        return reply.status(404).send({ error: 'Song not found' });
      }
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
  // Note: Must strip directional chars (like RLM U+200F) before checking for empty lines,
  // otherwise a line like " ‏" (space + RLM) won't be detected as empty after trim()
  for (let i = 0; i < lines.length && !metadataEnded; i++) {
    const line = stripDirectionalChars(lines[i]).trim();
    
    if (line === '') {
      metadataEnded = true;
      lineIndex = i + 1;
      continue;
    }

    // Check for title line: "Song Title - Artist" or "Song Title – Artist" (en-dash)
    // Some files use en-dash (U+2013) instead of hyphen
    if (i === 0 && (line.includes(' - ') || line.includes(' – '))) {
      // First line: "Song Title - Artist"
      const separator = line.includes(' - ') ? ' - ' : ' – ';
      const [t, a] = line.split(separator);
      if (t) title = stripDirectionalChars(t).trim();
      if (a) artist = stripDirectionalChars(a).trim();
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
    parsedLines.push(parseLine(lines[i], isRtl));
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

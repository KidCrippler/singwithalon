import { FastifyInstance } from 'fastify';
import { playingStateQueries, sessionQueries, queueQueries } from '../db/index.js';
import { getSongsIndex } from './songs.js';
import { requireAdmin } from './auth.js';
import { getIO } from '../socket/index.js';

// Helper: Get enriched song info
function getEnrichedSong(songId: number | null) {
  if (!songId) return null;
  const songsIndex = getSongsIndex();
  const song = songsIndex.find(s => s.id === songId);
  if (!song) return null;
  return {
    id: song.id,
    name: song.name,
    singer: song.singer,
    composers: song.composers,
    lyricists: song.lyricists,
    translators: song.translators,
    direction: song.direction,
  };
}

// Helper: Get song status for search view coloring
async function getSongStatus() {
  const state = await playingStateQueries.get();
  return {
    currentSongId: state.current_song_id,
    pendingSongIds: await queueQueries.getPendingSongIds(),
    playedSongIds: await queueQueries.getPlayedSongIds(),
  };
}

// Helper: Broadcast song status to all clients (for search view coloring)
async function broadcastSongStatus() {
  const io = getIO();
  if (!io) return;
  io.to('playing-now').emit('songs:status-changed', await getSongStatus());
}

// Helper: Broadcast song changed to all viewers
async function broadcastSongChanged() {
  const io = getIO();
  if (!io) return;
  const state = await playingStateQueries.get();
  io.to('playing-now').emit('song:changed', {
    songId: state.current_song_id,
    verseIndex: state.current_verse_index,
    keyOffset: state.current_key_offset,
    displayMode: state.display_mode,
    versesEnabled: !!state.verses_enabled,
  });
  // Also broadcast song status for search view coloring
  await broadcastSongStatus();
}

export async function stateRoutes(fastify: FastifyInstance) {
  // Get current playing state
  fastify.get('/api/state', async (request, reply) => {
    const state = await playingStateQueries.get();
    const songStatus = await getSongStatus();
    return {
      currentSongId: state.current_song_id,
      currentVerseIndex: state.current_verse_index,
      currentKeyOffset: state.current_key_offset,
      displayMode: state.display_mode,
      versesEnabled: state.verses_enabled === 1,
      projectorWidth: state.projector_width,
      projectorHeight: state.projector_height,
      projectorLinesPerVerse: state.projector_lines_per_verse,
      song: getEnrichedSong(state.current_song_id),
      // Song status for search view coloring
      pendingSongIds: songStatus.pendingSongIds,
      playedSongIds: songStatus.playedSongIds,
    };
  });

  // === Admin State Controls ===

  // Set current song
  fastify.post<{ Body: { songId: number } }>('/api/state/song', { preHandler: requireAdmin }, async (request, reply) => {
    const { songId } = request.body;
    
    const songsIndex = getSongsIndex();
    const song = songsIndex.find(s => s.id === songId);
    if (!song) {
      return reply.status(404).send({ error: 'Song not found' });
    }

    // Mark the previous song as played (if there was one)
    const currentState = await playingStateQueries.get();
    if (currentState.current_song_id) {
      await queueQueries.markSongPlayed(currentState.current_song_id);
    }

    await playingStateQueries.update({
      current_song_id: songId,
      current_verse_index: 0,
      current_key_offset: 0,
    });

    await broadcastSongChanged();
    return { success: true };
  });

  // Clear current song (show splash)
  fastify.delete('/api/state/song', { preHandler: requireAdmin }, async (request, reply) => {
    await playingStateQueries.clearSong();
    
    const io = getIO();
    io?.to('playing-now').emit('song:cleared', {});
    
    return { success: true };
  });

  // Next verse
  fastify.post('/api/state/verse/next', { preHandler: requireAdmin }, async (request, reply) => {
    const state = await playingStateQueries.get();
    const newIndex = state.current_verse_index + 1;
    await playingStateQueries.update({ current_verse_index: newIndex });
    
    const io = getIO();
    io?.to('playing-now').emit('verse:changed', { verseIndex: newIndex });
    
    return { success: true, verseIndex: newIndex };
  });

  // Previous verse
  fastify.post('/api/state/verse/prev', { preHandler: requireAdmin }, async (request, reply) => {
    const state = await playingStateQueries.get();
    const newIndex = Math.max(0, state.current_verse_index - 1);
    await playingStateQueries.update({ current_verse_index: newIndex });
    
    const io = getIO();
    io?.to('playing-now').emit('verse:changed', { verseIndex: newIndex });
    
    return { success: true, verseIndex: newIndex };
  });

  // Set specific verse
  fastify.post<{ Body: { verseIndex: number } }>('/api/state/verse', { preHandler: requireAdmin }, async (request, reply) => {
    const { verseIndex } = request.body;
    await playingStateQueries.update({ current_verse_index: verseIndex });
    
    const io = getIO();
    io?.to('playing-now').emit('verse:changed', { verseIndex });
    
    return { success: true, verseIndex };
  });

  // Sync key to all viewers (admin sends their current local key)
  fastify.post<{ Body: { keyOffset: number } }>('/api/state/key/sync', { preHandler: requireAdmin }, async (request, reply) => {
    const { keyOffset } = request.body;
    
    const io = getIO();
    // Broadcast key:sync to all viewers with the admin's current key
    io?.to('playing-now').emit('key:sync', { keyOffset });
    
    return { success: true, keyOffset };
  });

  // Set display mode
  fastify.post<{ Body: { displayMode: 'lyrics' | 'chords' } }>('/api/state/mode', { preHandler: requireAdmin }, async (request, reply) => {
    const { displayMode } = request.body;
    await playingStateQueries.update({ display_mode: displayMode });
    
    const io = getIO();
    io?.to('playing-now').emit('mode:changed', { displayMode });
    
    return { success: true, displayMode };
  });

  // Toggle verses enabled
  fastify.post('/api/state/verses/toggle', { preHandler: requireAdmin }, async (request, reply) => {
    const state = await playingStateQueries.get();
    const newVersesEnabled = state.verses_enabled ? 0 : 1;
    await playingStateQueries.update({ verses_enabled: newVersesEnabled });
    
    const io = getIO();
    io?.to('playing-now').emit('verses:toggled', { versesEnabled: !!newVersesEnabled });
    
    return { success: true, versesEnabled: !!newVersesEnabled };
  });

  // === Projector Registration ===

  fastify.post<{ Body: { width: number; height: number; linesPerVerse: number } }>('/api/projector/register', async (request, reply) => {
    const { width, height, linesPerVerse } = request.body;
    const sessionId = request.sessionId;

    if (!sessionId) {
      return reply.status(400).send({ error: 'Session ID required' });
    }

    await sessionQueries.upsert(sessionId, {
      is_projector: true,
      resolution_width: width,
      resolution_height: height,
      lines_per_verse: linesPerVerse,
    });

    // Check if this is the first projector
    const state = await playingStateQueries.get();
    if (!state.projector_width) {
      await playingStateQueries.update({
        projector_width: width,
        projector_height: height,
        projector_lines_per_verse: linesPerVerse,
      });
      
      // Notify all clients of projector resolution
      const io = getIO();
      io?.to('playing-now').emit('projector:resolution', { width, height, linesPerVerse });
    }

    return { success: true, isFirstProjector: !state.projector_width };
  });
}


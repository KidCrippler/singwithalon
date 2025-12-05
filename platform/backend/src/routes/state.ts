import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { playingStateQueries, sessionQueries, queueQueries, adminQueries } from '../db/index.js';
import { getSongsIndex } from './songs.js';
import { resolveRoom, requireRoomOwner } from './auth.js';
import { getIO, broadcastToRoom } from '../socket/index.js';
import { analytics, AnalyticsTrigger } from '../services/analytics.js';

interface RoomParams {
  username: string;
}

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

// Helper: Get song status for search view coloring (room-scoped)
async function getSongStatus(adminId: number) {
  const state = await playingStateQueries.get(adminId);
  return {
    currentSongId: state?.current_song_id ?? null,
    pendingSongIds: await queueQueries.getPendingSongIds(adminId),
    playedSongIds: await queueQueries.getPlayedSongIds(adminId),
  };
}

// Helper: Broadcast song status to all clients in room (for search view coloring)
async function broadcastSongStatus(adminId: number) {
  broadcastToRoom(adminId, 'viewers', 'songs:status-changed', await getSongStatus(adminId));
}

// Helper: Broadcast song changed to all viewers in room
async function broadcastSongChanged(adminId: number) {
  const state = await playingStateQueries.get(adminId);
  if (!state) return;
  
  broadcastToRoom(adminId, 'viewers', 'song:changed', {
    songId: state.current_song_id,
    verseIndex: state.current_verse_index,
    keyOffset: state.current_key_offset,
    displayMode: state.display_mode,
    versesEnabled: !!state.verses_enabled,
  });
  
  // Also broadcast song status for search view coloring
  await broadcastSongStatus(adminId);
}

export async function stateRoutes(fastify: FastifyInstance) {
  // Get current playing state (room-scoped)
  fastify.get<{ Params: RoomParams }>(
    '/api/rooms/:username/state',
    { preHandler: resolveRoom },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const state = await playingStateQueries.get(adminId);
      
      if (!state) {
        return reply.status(404).send({ error: 'Room state not found' });
      }
      
      const songStatus = await getSongStatus(adminId);
      
      return {
        roomUsername: request.room!.username,
        roomDisplayName: request.room!.displayName,
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
    }
  );

  // === Admin State Controls (room-scoped) ===

  // Set current song
  fastify.post<{ Params: RoomParams; Body: { songId: number; trigger?: 'search' | 'song_view' } }>(
    '/api/rooms/:username/state/song',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const { songId, trigger = 'search' } = request.body;
      
      const songsIndex = getSongsIndex();
      const song = songsIndex.find(s => s.id === songId);
      if (!song) {
        return reply.status(404).send({ error: 'Song not found' });
      }

      // Mark the previous song as played (if there was one)
      const currentState = await playingStateQueries.get(adminId);
      if (currentState?.current_song_id) {
        await queueQueries.markSongPlayed(adminId, currentState.current_song_id);
      }

      // Track analytics - admin direct play (no viewer credit)
      analytics.trackSongEvent({
        roomId: adminId,
        songId,
        action: 'played',
        trigger: trigger as AnalyticsTrigger,
        // No viewerName/sessionId - this is admin direct play
      });

      await playingStateQueries.update(adminId, {
        current_song_id: songId,
        current_verse_index: 0,
        current_key_offset: 0,
      });

      await broadcastSongChanged(adminId);
      return { success: true };
    }
  );

  // Clear current song (show splash)
  fastify.delete<{ Params: RoomParams }>(
    '/api/rooms/:username/state/song',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      await playingStateQueries.clearSong(adminId);
      
      broadcastToRoom(adminId, 'viewers', 'song:cleared', {});
      
      return { success: true };
    }
  );

  // Next verse
  fastify.post<{ Params: RoomParams }>(
    '/api/rooms/:username/state/verse/next',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const state = await playingStateQueries.get(adminId);
      if (!state) {
        return reply.status(404).send({ error: 'Room state not found' });
      }
      
      const newIndex = state.current_verse_index + 1;
      await playingStateQueries.update(adminId, { current_verse_index: newIndex });
      
      broadcastToRoom(adminId, 'viewers', 'verse:changed', { verseIndex: newIndex });
      
      return { success: true, verseIndex: newIndex };
    }
  );

  // Previous verse
  fastify.post<{ Params: RoomParams }>(
    '/api/rooms/:username/state/verse/prev',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const state = await playingStateQueries.get(adminId);
      if (!state) {
        return reply.status(404).send({ error: 'Room state not found' });
      }
      
      const newIndex = Math.max(0, state.current_verse_index - 1);
      await playingStateQueries.update(adminId, { current_verse_index: newIndex });
      
      broadcastToRoom(adminId, 'viewers', 'verse:changed', { verseIndex: newIndex });
      
      return { success: true, verseIndex: newIndex };
    }
  );

  // Set specific verse
  fastify.post<{ Params: RoomParams; Body: { verseIndex: number } }>(
    '/api/rooms/:username/state/verse',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const { verseIndex } = request.body;
      await playingStateQueries.update(adminId, { current_verse_index: verseIndex });
      
      broadcastToRoom(adminId, 'viewers', 'verse:changed', { verseIndex });
      
      return { success: true, verseIndex };
    }
  );

  // Sync key to all viewers (admin sends their current local key)
  fastify.post<{ Params: RoomParams; Body: { keyOffset: number } }>(
    '/api/rooms/:username/state/key/sync',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const { keyOffset } = request.body;
      
      // Broadcast key:sync to all viewers in room with the admin's current key
      broadcastToRoom(adminId, 'viewers', 'key:sync', { keyOffset });
      
      return { success: true, keyOffset };
    }
  );

  // Set display mode
  fastify.post<{ Params: RoomParams; Body: { displayMode: 'lyrics' | 'chords' } }>(
    '/api/rooms/:username/state/mode',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const { displayMode } = request.body;
      await playingStateQueries.update(adminId, { display_mode: displayMode });
      
      broadcastToRoom(adminId, 'viewers', 'mode:changed', { displayMode });
      
      return { success: true, displayMode };
    }
  );

  // Toggle verses enabled
  fastify.post<{ Params: RoomParams }>(
    '/api/rooms/:username/state/verses/toggle',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const state = await playingStateQueries.get(adminId);
      if (!state) {
        return reply.status(404).send({ error: 'Room state not found' });
      }
      
      const newVersesEnabled = state.verses_enabled ? 0 : 1;
      await playingStateQueries.update(adminId, { verses_enabled: newVersesEnabled });
      
      broadcastToRoom(adminId, 'viewers', 'verses:toggled', { versesEnabled: !!newVersesEnabled });
      
      return { success: true, versesEnabled: !!newVersesEnabled };
    }
  );

  // === Projector Registration (room-scoped) ===

  fastify.post<{ Params: RoomParams; Body: { width: number; height: number; linesPerVerse: number } }>(
    '/api/rooms/:username/projector/register',
    { preHandler: resolveRoom },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const { width, height, linesPerVerse } = request.body;
      const sessionId = request.sessionId;

      if (!sessionId) {
        return reply.status(400).send({ error: 'Session ID required' });
      }

      await sessionQueries.upsert(adminId, sessionId, {
        is_projector: true,
        resolution_width: width,
        resolution_height: height,
        lines_per_verse: linesPerVerse,
      });

      // Check if this is the first projector in this room
      const state = await playingStateQueries.get(adminId);
      if (state && !state.projector_width) {
        await playingStateQueries.update(adminId, {
          projector_width: width,
          projector_height: height,
          projector_lines_per_verse: linesPerVerse,
        });
        
        // Notify all clients in room of projector resolution
        broadcastToRoom(adminId, 'viewers', 'projector:resolution', { width, height, linesPerVerse });
      }

      return { success: true, isFirstProjector: !state?.projector_width };
    }
  );
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { playlistQueries, playingStateQueries, queueQueries } from '../db/index.js';
import { getSongsIndex } from './songs.js';
import { resolveRoom, requireRoomOwner } from './auth.js';
import { broadcastToRoom } from '../socket/index.js';

interface RoomParams {
  username: string;
}

interface PlaylistIdParams extends RoomParams {
  id: string;
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
}

// Helper: Broadcast song status for search view coloring
async function broadcastSongStatus(adminId: number) {
  const state = await playingStateQueries.get(adminId);
  broadcastToRoom(adminId, 'viewers', 'songs:status-changed', {
    currentSongId: state?.current_song_id ?? null,
    pendingSongIds: await queueQueries.getPendingSongIds(adminId),
    playedSongIds: await queueQueries.getPlayedSongIds(adminId),
  });
}

// Helper: Enrich song IDs with names from the in-memory index
function enrichSongIds(songIds: number[]) {
  const songsIndex = getSongsIndex();
  return songIds.map((songId, position) => {
    const song = songsIndex.find(s => s.id === songId);
    return {
      position,
      songId,
      songName: song?.name ?? '(לא נמצא)',
      songArtist: song?.singer ?? '',
    };
  });
}

export async function playlistRoutes(fastify: FastifyInstance) {
  // List all playlists for room
  fastify.get<{ Params: RoomParams }>(
    '/api/rooms/:username/playlists',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request) => {
      const adminId = request.room!.adminId;
      const playlists = await playlistQueries.getAllForRoom(adminId);
      return playlists.map(p => ({
        id: p.id,
        name: p.name,
        isActive: !!p.is_active,
        songCount: (JSON.parse(p.song_ids) as number[]).length,
      }));
    }
  );

  // Get active playlist with enriched song list
  fastify.get<{ Params: RoomParams }>(
    '/api/rooms/:username/playlists/active',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const playlist = await playlistQueries.getActive(adminId);
      if (!playlist) {
        return reply.status(404).send({ error: 'No active playlist' });
      }

      const songIds = JSON.parse(playlist.song_ids) as number[];
      const state = await playingStateQueries.get(adminId);

      return {
        id: playlist.id,
        name: playlist.name,
        isActive: true,
        songs: enrichSongIds(songIds),
        position: state?.playlist_position ?? -1,
      };
    }
  );

  // Activate a playlist
  fastify.post<{ Params: PlaylistIdParams }>(
    '/api/rooms/:username/playlists/:id/activate',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const playlistId = parseInt(request.params.id, 10);

      const playlist = await playlistQueries.getById(playlistId);
      if (!playlist || playlist.admin_id !== adminId) {
        return reply.status(404).send({ error: 'Playlist not found' });
      }

      await playlistQueries.setActive(adminId, playlistId);
      await playingStateQueries.update(adminId, {
        active_playlist_id: playlistId,
        playlist_position: -1,
      });

      broadcastToRoom(adminId, 'admin', 'playlist:activated', { playlistId });
      return { success: true };
    }
  );

  // Deactivate all playlists (choose "none")
  fastify.post<{ Params: RoomParams }>(
    '/api/rooms/:username/playlists/deactivate',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request) => {
      const adminId = request.room!.adminId;

      await playlistQueries.deactivateAll(adminId);
      await playingStateQueries.update(adminId, {
        active_playlist_id: null,
        playlist_position: -1,
      });

      broadcastToRoom(adminId, 'admin', 'playlist:activated', { playlistId: null });
      return { success: true };
    }
  );

  // Next song in playlist
  fastify.post<{ Params: RoomParams }>(
    '/api/rooms/:username/playlist/next',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const state = await playingStateQueries.get(adminId);
      if (!state?.active_playlist_id) {
        return reply.status(400).send({ error: 'No active playlist' });
      }

      const playlist = await playlistQueries.getById(state.active_playlist_id);
      if (!playlist) {
        return reply.status(404).send({ error: 'Playlist not found' });
      }

      const songIds = JSON.parse(playlist.song_ids) as number[];
      const targetPosition = state.playlist_position + 1;

      if (targetPosition >= songIds.length) {
        return reply.status(400).send({ error: 'Already at last song' });
      }

      return presentFromPlaylist(adminId, songIds, targetPosition);
    }
  );

  // Previous song in playlist
  fastify.post<{ Params: RoomParams }>(
    '/api/rooms/:username/playlist/prev',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const state = await playingStateQueries.get(adminId);
      if (!state?.active_playlist_id) {
        return reply.status(400).send({ error: 'No active playlist' });
      }

      const playlist = await playlistQueries.getById(state.active_playlist_id);
      if (!playlist) {
        return reply.status(404).send({ error: 'Playlist not found' });
      }

      const songIds = JSON.parse(playlist.song_ids) as number[];
      const targetPosition = state.playlist_position - 1;

      if (targetPosition < 0) {
        return reply.status(400).send({ error: 'Already at first song' });
      }

      return presentFromPlaylist(adminId, songIds, targetPosition);
    }
  );

  // Jump to specific position in playlist
  fastify.post<{ Params: RoomParams; Body: { position: number } }>(
    '/api/rooms/:username/playlist/jump',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const { position } = request.body;
      const state = await playingStateQueries.get(adminId);
      if (!state?.active_playlist_id) {
        return reply.status(400).send({ error: 'No active playlist' });
      }

      const playlist = await playlistQueries.getById(state.active_playlist_id);
      if (!playlist) {
        return reply.status(404).send({ error: 'Playlist not found' });
      }

      const songIds = JSON.parse(playlist.song_ids) as number[];
      if (position < 0 || position >= songIds.length) {
        return reply.status(400).send({ error: 'Invalid position' });
      }

      return presentFromPlaylist(adminId, songIds, position);
    }
  );
}

// Shared logic: present a song from the playlist at a given position
async function presentFromPlaylist(adminId: number, songIds: number[], position: number) {
  const songId = songIds[position];

  // Mark previous song as played
  const currentState = await playingStateQueries.get(adminId);
  if (currentState?.current_song_id) {
    await queueQueries.markSongPlayed(adminId, currentState.current_song_id);
  }

  // Update playing state
  await playingStateQueries.update(adminId, {
    current_song_id: songId,
    current_verse_index: 0,
    current_key_offset: 0,
    playlist_position: position,
  });

  // Broadcast to all clients
  await broadcastSongChanged(adminId);
  await broadcastSongStatus(adminId);
  broadcastToRoom(adminId, 'admin', 'playlist:position-changed', { position, songId });

  return { success: true, position, songId };
}

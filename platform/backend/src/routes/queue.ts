import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { queueQueries, playingStateQueries } from '../db/index.js';
import { resolveRoom, requireRoomOwner } from './auth.js';
import { getSongsIndex } from './songs.js';
import { broadcastToRoom } from '../socket/index.js';
import { analytics } from '../services/analytics.js';

const MAX_QUEUE_PER_SESSION = 50;

interface RoomParams {
  username: string;
}

interface AddToQueueBody {
  songId: number;
  requesterName: string;
  notes?: string;  // Optional notes (max 50 chars, enforced below)
}

// Helper: Get enriched grouped queue with song info (excludes __SYSTEM__ entries)
async function getEnrichedGroupedQueue(adminId: number) {
  const songsIndex = getSongsIndex();
  const groupedQueue = await queueQueries.getGrouped(adminId);
  // Filter out __SYSTEM__ entries (used for tracking "Present Now" plays)
  return groupedQueue
    .filter(group => group.sessionId !== '__SYSTEM__')
    .map(group => ({
      ...group,
      entries: group.entries.map(entry => {
        const song = songsIndex.find(s => s.id === entry.song_id);
        return {
          ...entry,
          songName: song?.name ?? 'Unknown Song',
          songArtist: song?.singer ?? 'Unknown Artist',
        };
      }),
    }));
}

// Helper: Get song status for search view coloring
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

// Helper: Broadcast queue update to admins in room via socket
async function broadcastQueueUpdate(adminId: number) {
  broadcastToRoom(adminId, 'admin', 'queue:updated', { queue: await getEnrichedGroupedQueue(adminId) });
  // Also broadcast song status for search view coloring
  await broadcastSongStatus(adminId);
}

export async function queueRoutes(fastify: FastifyInstance) {
  // Get current queue (admin only, room-scoped)
  fastify.get<{ Params: RoomParams }>(
    '/api/rooms/:username/queue',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      return await getEnrichedGroupedQueue(adminId);
    }
  );

  // Add to queue (any viewer, room-scoped)
  fastify.post<{ Params: RoomParams; Body: AddToQueueBody }>(
    '/api/rooms/:username/queue',
    { preHandler: resolveRoom },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const { songId, requesterName, notes } = request.body;
      const sessionId = request.sessionId;

      if (!sessionId) {
        return reply.status(400).send({ error: 'Session ID required' });
      }

      if (!songId || !requesterName?.trim()) {
        return reply.status(400).send({ error: 'יש להזין שם' });
      }

      // Check if song exists
      const songsIndex = getSongsIndex();
      const song = songsIndex.find(s => s.id === songId);
      if (!song) {
        return reply.status(404).send({ error: 'השיר לא נמצא' });
      }

      // Check if song is private (only admin can add private songs)
      const isAdmin = request.user?.isAdmin ?? false;
      if (song.isPrivate && !isAdmin) {
        return reply.status(403).send({ error: 'לא ניתן להוסיף שיר זה לתור' });
      }

      // Check queue limit for this room
      const currentCount = await queueQueries.countBySession(adminId, sessionId);
      if (currentCount >= MAX_QUEUE_PER_SESSION) {
        return reply.status(429).send({ 
          error: `הגעת למגבלת השירים בתור (${MAX_QUEUE_PER_SESSION}). נסה שוב אחרי שחלק יבוצעו.` 
        });
      }

      // Trim and limit notes to 50 characters
      const trimmedNotes = notes?.trim().slice(0, 50) || undefined;

      const entry = await queueQueries.add(adminId, songId, requesterName.trim(), sessionId, trimmedNotes);
      
      // Track analytics
      analytics.trackSongEvent({
        roomId: adminId,
        songId,
        action: 'queued',
        trigger: 'search',
        viewerName: requesterName.trim(),
        sessionId,
      });
      
      // Notify admins in room via socket
      await broadcastQueueUpdate(adminId);
      
      return { 
        success: true, 
        entry: {
          ...entry,
          songName: song.name,
          songArtist: song.singer,
        }
      };
    }
  );

  // Remove from queue (own entries only, room-scoped)
  fastify.delete<{ Params: RoomParams & { id: string } }>(
    '/api/rooms/:username/queue/:id',
    { preHandler: resolveRoom },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const entryId = parseInt(request.params.id, 10);
      const sessionId = request.sessionId;

      if (!sessionId) {
        return reply.status(400).send({ error: 'Session ID required' });
      }

      const removed = await queueQueries.remove(entryId, sessionId);
      if (!removed) {
        return reply.status(404).send({ error: 'Queue entry not found or not yours to remove' });
      }

      // Notify admins in room via socket
      await broadcastQueueUpdate(adminId);

      return { success: true };
    }
  );

  // Get own queue entries (any viewer, room-scoped)
  fastify.get<{ Params: RoomParams }>(
    '/api/rooms/:username/queue/mine',
    { preHandler: resolveRoom },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const sessionId = request.sessionId;

      if (!sessionId) {
        return reply.status(400).send({ error: 'Session ID required' });
      }

      const entries = await queueQueries.getBySession(adminId, sessionId);
      return enrichEntriesWithSongInfo(entries);
    }
  );

  // === Admin Queue Operations (room-scoped) ===

  // Present from queue (sets song as playing, marks entry as played)
  fastify.post<{ Params: RoomParams & { id: string } }>(
    '/api/rooms/:username/queue/:id/present',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const queueId = parseInt(request.params.id, 10);
      
      // Get the queue entry
      const entries = await queueQueries.getAll(adminId);
      const entry = entries.find(e => e.id === queueId);
      
      if (!entry) {
        return reply.status(404).send({ error: 'Queue entry not found' });
      }

      // Mark the previous song as played (if there was one)
      const currentState = await playingStateQueries.get(adminId);
      if (currentState?.current_song_id) {
        await queueQueries.markSongPlayed(adminId, currentState.current_song_id);
      }

      // Mark this queue entry as played
      await queueQueries.markPlayed(queueId);

      // Track analytics - song played from queue, credit goes to the requester
      analytics.trackSongEvent({
        roomId: adminId,
        songId: entry.song_id,
        action: 'played',
        trigger: 'queue',
        viewerName: entry.requester_name,
        sessionId: entry.session_id,
      });

      // Set as current song
      const state = await playingStateQueries.update(adminId, {
        current_song_id: entry.song_id,
        current_verse_index: 0,
        current_key_offset: 0,
      });

      // Broadcast song change to all viewers in room
      if (state) {
        broadcastToRoom(adminId, 'viewers', 'song:changed', {
          songId: state.current_song_id,
          verseIndex: state.current_verse_index,
          keyOffset: state.current_key_offset,
          displayMode: state.display_mode,
          versesEnabled: !!state.verses_enabled,
        });
      }

      // Broadcast queue update to admins in room (also broadcasts song status)
      await broadcastQueueUpdate(adminId);

      return { success: true };
    }
  );

  // Admin delete entry (can delete any entry in room)
  fastify.delete<{ Params: RoomParams & { id: string } }>(
    '/api/rooms/:username/queue/:id/admin',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const queueId = parseInt(request.params.id, 10);
      
      // Get entry info before deleting (for analytics)
      const entries = await queueQueries.getAll(adminId);
      const entry = entries.find(e => e.id === queueId);
      
      const removed = await queueQueries.removeById(queueId);
      if (!removed) {
        return reply.status(404).send({ error: 'Queue entry not found' });
      }

      // Track analytics
      if (entry) {
        analytics.trackSongEvent({
          roomId: adminId,
          songId: entry.song_id,
          action: 'removed_by_admin',
          trigger: 'queue',
          viewerName: entry.requester_name,
          sessionId: entry.session_id,
        });
      }

      await broadcastQueueUpdate(adminId);
      return { success: true };
    }
  );

  // Admin delete group (all entries from a session+requester combination in room)
  fastify.delete<{ Params: RoomParams; Body: { sessionId: string; requesterName: string } }>(
    '/api/rooms/:username/queue/group',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      const { sessionId, requesterName } = request.body;
      
      if (!sessionId || !requesterName) {
        return reply.status(400).send({ error: 'sessionId and requesterName are required' });
      }
      
      const count = await queueQueries.removeByGroup(adminId, sessionId, requesterName);
      if (count === 0) {
        return reply.status(404).send({ error: 'No entries found for this group' });
      }

      await broadcastQueueUpdate(adminId);
      return { success: true, deletedCount: count };
    }
  );

  // Admin truncate queue (clear all in room) - also clears the current song
  fastify.delete<{ Params: RoomParams }>(
    '/api/rooms/:username/queue',
    { preHandler: [resolveRoom, requireRoomOwner] },
    async (request, reply) => {
      const adminId = request.room!.adminId;
      
      await queueQueries.truncate(adminId);
      
      // Start new analytics event (queue truncate = new session/event)
      analytics.resetEvent(adminId);
      
      // Also clear the current song (return to splash screen)
      await playingStateQueries.clearSong(adminId);
      
      // Broadcast song cleared to all viewers in room
      broadcastToRoom(adminId, 'viewers', 'song:cleared', {});
      
      await broadcastQueueUpdate(adminId);
      return { success: true };
    }
  );
}

// Helper: Enrich queue entries with song info
function enrichEntriesWithSongInfo(entries: Awaited<ReturnType<typeof queueQueries.getBySession>>) {
  const songsIndex = getSongsIndex();
  return entries.map(entry => {
    const song = songsIndex.find(s => s.id === entry.song_id);
    return {
      ...entry,
      songName: song?.name ?? 'Unknown Song',
      songArtist: song?.singer ?? 'Unknown Artist',
    };
  });
}

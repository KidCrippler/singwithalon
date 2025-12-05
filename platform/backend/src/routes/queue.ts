import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { queueQueries, playingStateQueries } from '../db/index.js';
import { requireAdmin } from './auth.js';
import { getSongsIndex } from './songs.js';
import { getIO } from '../socket/index.js';

const MAX_QUEUE_PER_SESSION = 25;

interface AddToQueueBody {
  songId: number;
  requesterName: string;
  notes?: string;  // Optional notes (max 50 chars, enforced below)
}

// Helper: Get enriched grouped queue with song info (excludes __SYSTEM__ entries)
async function getEnrichedGroupedQueue() {
  const songsIndex = getSongsIndex();
  const groupedQueue = await queueQueries.getGrouped();
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
  if (io) {
    io.to('playing-now').emit('songs:status-changed', await getSongStatus());
  }
}

// Helper: Broadcast queue update to admins via socket
async function broadcastQueueUpdate() {
  const io = getIO();
  if (io) {
    io.to('admin').emit('queue:updated', { queue: await getEnrichedGroupedQueue() });
  }
  // Also broadcast song status for search view coloring
  await broadcastSongStatus();
}

export async function queueRoutes(fastify: FastifyInstance) {
  // Get current queue (admin only)
  fastify.get('/api/queue', { preHandler: requireAdmin }, async (request, reply) => {
    return await getEnrichedGroupedQueue();
  });

  // Add to queue (any viewer)
  fastify.post<{ Body: AddToQueueBody }>('/api/queue', async (request, reply) => {
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

    // Check queue limit
    const currentCount = await queueQueries.countBySession(sessionId);
    if (currentCount >= MAX_QUEUE_PER_SESSION) {
      return reply.status(429).send({ 
        error: `הגעת למגבלת השירים בתור (${MAX_QUEUE_PER_SESSION}). נסה שוב אחרי שחלק יבוצעו.` 
      });
    }

    // Trim and limit notes to 50 characters
    const trimmedNotes = notes?.trim().slice(0, 50) || undefined;

    const entry = await queueQueries.add(songId, requesterName.trim(), sessionId, trimmedNotes);
    
    // Notify admins via socket
    await broadcastQueueUpdate();
    
    return { 
      success: true, 
      entry: {
        ...entry,
        songName: song.name,
        songArtist: song.singer,
      }
    };
  });

  // Remove from queue (own entries only)
  fastify.delete<{ Params: { id: string } }>('/api/queue/:id', async (request, reply) => {
    const entryId = parseInt(request.params.id, 10);
    const sessionId = request.sessionId;

    if (!sessionId) {
      return reply.status(400).send({ error: 'Session ID required' });
    }

    const removed = await queueQueries.remove(entryId, sessionId);
    if (!removed) {
      return reply.status(404).send({ error: 'Queue entry not found or not yours to remove' });
    }

    // Notify admins via socket
    await broadcastQueueUpdate();

    return { success: true };
  });

  // Get own queue entries (any viewer)
  fastify.get('/api/queue/mine', async (request, reply) => {
    const sessionId = request.sessionId;

    if (!sessionId) {
      return reply.status(400).send({ error: 'Session ID required' });
    }

    const entries = await queueQueries.getBySession(sessionId);
    return enrichEntriesWithSongInfo(entries);
  });

  // === Admin Queue Operations ===

  // Present from queue (sets song as playing, marks entry as played)
  fastify.post<{ Params: { id: string } }>('/api/queue/:id/present', { preHandler: requireAdmin }, async (request, reply) => {
    const queueId = parseInt(request.params.id, 10);
    
    // Get the queue entry
    const entries = await queueQueries.getAll();
    const entry = entries.find(e => e.id === queueId);
    
    if (!entry) {
      return reply.status(404).send({ error: 'Queue entry not found' });
    }

    // Mark the previous song as played (if there was one)
    const currentState = await playingStateQueries.get();
    if (currentState.current_song_id) {
      await queueQueries.markSongPlayed(currentState.current_song_id);
    }

    // Mark this queue entry as played
    await queueQueries.markPlayed(queueId);

    // Set as current song
    const state = await playingStateQueries.update({
      current_song_id: entry.song_id,
      current_verse_index: 0,
      current_key_offset: 0,
    });

    // Broadcast song change to all viewers
    const io = getIO();
    if (io) {
      io.to('playing-now').emit('song:changed', {
        songId: state.current_song_id,
        verseIndex: state.current_verse_index,
        keyOffset: state.current_key_offset,
        displayMode: state.display_mode,
        versesEnabled: !!state.verses_enabled,
      });
    }

    // Broadcast queue update to admins (also broadcasts song status)
    await broadcastQueueUpdate();

    return { success: true };
  });

  // Admin delete entry (can delete any entry)
  fastify.delete<{ Params: { id: string } }>('/api/queue/:id/admin', { preHandler: requireAdmin }, async (request, reply) => {
    const queueId = parseInt(request.params.id, 10);
    
    const removed = await queueQueries.removeById(queueId);
    if (!removed) {
      return reply.status(404).send({ error: 'Queue entry not found' });
    }

    await broadcastQueueUpdate();
    return { success: true };
  });

  // Admin delete group (all entries from a session+requester combination)
  fastify.delete<{ Body: { sessionId: string; requesterName: string } }>('/api/queue/group', { preHandler: requireAdmin }, async (request, reply) => {
    const { sessionId, requesterName } = request.body;
    
    if (!sessionId || !requesterName) {
      return reply.status(400).send({ error: 'sessionId and requesterName are required' });
    }
    
    const count = await queueQueries.removeByGroup(sessionId, requesterName);
    if (count === 0) {
      return reply.status(404).send({ error: 'No entries found for this group' });
    }

    await broadcastQueueUpdate();
    return { success: true, deletedCount: count };
  });

  // Admin truncate queue (clear all) - also clears the current song
  fastify.delete('/api/queue', { preHandler: requireAdmin }, async (request, reply) => {
    await queueQueries.truncate();
    
    // Also clear the current song (return to splash screen)
    await playingStateQueries.clearSong();
    
    // Broadcast song cleared to all viewers
    const io = getIO();
    if (io) {
      io.to('playing-now').emit('song:cleared', {});
    }
    
    await broadcastQueueUpdate();
    return { success: true };
  });
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


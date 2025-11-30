import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { queueQueries, playingStateQueries } from '../db/index.js';
import { requireAdmin } from './auth.js';
import { getSongsIndex } from './songs.js';
import { getIO } from '../socket/index.js';

const MAX_QUEUE_PER_SESSION = 25;

interface AddToQueueBody {
  songId: number;
  requesterName: string;
}

// Helper: Get enriched grouped queue with song info
function getEnrichedGroupedQueue() {
  const songsIndex = getSongsIndex();
  const groupedQueue = queueQueries.getGrouped();
  return groupedQueue.map(group => ({
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

// Helper: Broadcast queue update to admins via socket
function broadcastQueueUpdate() {
  const io = getIO();
  if (io) {
    io.to('admin').emit('queue:updated', { queue: getEnrichedGroupedQueue() });
  }
}

export async function queueRoutes(fastify: FastifyInstance) {
  // Get current queue (admin only)
  fastify.get('/api/queue', { preHandler: requireAdmin }, async (request, reply) => {
    return getEnrichedGroupedQueue();
  });

  // Add to queue (any viewer)
  fastify.post<{ Body: AddToQueueBody }>('/api/queue', async (request, reply) => {
    const { songId, requesterName } = request.body;
    const sessionId = request.sessionId;

    if (!sessionId) {
      return reply.status(400).send({ error: 'Session ID required' });
    }

    if (!songId || !requesterName?.trim()) {
      return reply.status(400).send({ error: 'Song ID and requester name are required' });
    }

    // Check if song exists
    const songsIndex = getSongsIndex();
    const song = songsIndex.find(s => s.id === songId);
    if (!song) {
      return reply.status(404).send({ error: 'Song not found' });
    }

    // Check if song is private (only admin can add private songs)
    const isAdmin = request.user?.isAdmin ?? false;
    if (song.isPrivate && !isAdmin) {
      return reply.status(403).send({ error: 'Cannot add private song to queue' });
    }

    // Check queue limit
    const currentCount = queueQueries.countBySession(sessionId);
    if (currentCount >= MAX_QUEUE_PER_SESSION) {
      return reply.status(429).send({ 
        error: `Queue limit reached. Maximum ${MAX_QUEUE_PER_SESSION} songs per viewer.` 
      });
    }

    const entry = queueQueries.add(songId, requesterName.trim(), sessionId);
    
    // Notify admins via socket
    broadcastQueueUpdate();
    
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

    const removed = queueQueries.remove(entryId, sessionId);
    if (!removed) {
      return reply.status(404).send({ error: 'Queue entry not found or not yours to remove' });
    }

    // Notify admins via socket
    broadcastQueueUpdate();

    return { success: true };
  });

  // Get own queue entries (any viewer)
  fastify.get('/api/queue/mine', async (request, reply) => {
    const sessionId = request.sessionId;

    if (!sessionId) {
      return reply.status(400).send({ error: 'Session ID required' });
    }

    const entries = queueQueries.getBySession(sessionId);
    return enrichEntriesWithSongInfo(entries);
  });

  // === Admin Queue Operations ===

  // Present from queue (sets song as playing, marks entry as played)
  fastify.post<{ Params: { id: string } }>('/api/queue/:id/present', { preHandler: requireAdmin }, async (request, reply) => {
    const queueId = parseInt(request.params.id, 10);
    
    // Get the queue entry
    const entries = queueQueries.getAll();
    const entry = entries.find(e => e.id === queueId);
    
    if (!entry) {
      return reply.status(404).send({ error: 'Queue entry not found' });
    }

    // Mark as played
    queueQueries.markPlayed(queueId);

    // Set as current song
    const state = playingStateQueries.update({
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

    // Broadcast queue update to admins
    broadcastQueueUpdate();

    return { success: true };
  });

  // Admin delete entry (can delete any entry)
  fastify.delete<{ Params: { id: string } }>('/api/queue/:id/admin', { preHandler: requireAdmin }, async (request, reply) => {
    const queueId = parseInt(request.params.id, 10);
    
    const removed = queueQueries.removeById(queueId);
    if (!removed) {
      return reply.status(404).send({ error: 'Queue entry not found' });
    }

    broadcastQueueUpdate();
    return { success: true };
  });

  // Admin delete group (all entries from a session+requester combination)
  fastify.delete<{ Body: { sessionId: string; requesterName: string } }>('/api/queue/group', { preHandler: requireAdmin }, async (request, reply) => {
    const { sessionId, requesterName } = request.body;
    
    if (!sessionId || !requesterName) {
      return reply.status(400).send({ error: 'sessionId and requesterName are required' });
    }
    
    const count = queueQueries.removeByGroup(sessionId, requesterName);
    if (count === 0) {
      return reply.status(404).send({ error: 'No entries found for this group' });
    }

    broadcastQueueUpdate();
    return { success: true, deletedCount: count };
  });

  // Admin truncate queue (clear all)
  fastify.delete('/api/queue', { preHandler: requireAdmin }, async (request, reply) => {
    queueQueries.truncate();
    broadcastQueueUpdate();
    return { success: true };
  });
}

// Helper: Enrich queue entries with song info
function enrichEntriesWithSongInfo(entries: ReturnType<typeof queueQueries.getBySession>) {
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


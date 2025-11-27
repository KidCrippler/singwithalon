import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { queueQueries } from '../db/index.js';
import { requireAdmin } from './auth.js';
import { getSongsIndex } from './songs.js';

const MAX_QUEUE_PER_SESSION = 25;

interface AddToQueueBody {
  songId: number;
  requesterName: string;
}

export async function queueRoutes(fastify: FastifyInstance) {
  // Get current queue (admin only)
  fastify.get('/api/queue', { preHandler: requireAdmin }, async (request, reply) => {
    const groupedQueue = queueQueries.getGrouped();
    
    // Enrich with song info
    const songsIndex = getSongsIndex();
    const enriched = groupedQueue.map(group => ({
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

    return enriched;
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

    return { success: true };
  });

  // Get own queue entries (any viewer)
  fastify.get('/api/queue/mine', async (request, reply) => {
    const sessionId = request.sessionId;

    if (!sessionId) {
      return reply.status(400).send({ error: 'Session ID required' });
    }

    const entries = queueQueries.getBySession(sessionId);
    
    // Enrich with song info
    const songsIndex = getSongsIndex();
    const enriched = entries.map(entry => {
      const song = songsIndex.find(s => s.id === entry.song_id);
      return {
        ...entry,
        songName: song?.name ?? 'Unknown Song',
        songArtist: song?.singer ?? 'Unknown Artist',
      };
    });

    return enriched;
  });
}


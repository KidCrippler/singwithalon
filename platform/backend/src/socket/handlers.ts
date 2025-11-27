import { Server, Socket } from 'socket.io';
import { playingStateQueries, queueQueries, sessionQueries } from '../db/index.js';
import { getSongsIndex } from '../routes/songs.js';
import type { AuthUser } from '../types/index.js';

interface SocketData {
  user?: AuthUser;
  sessionId: string;
}

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    const sessionId = socket.handshake.auth.sessionId || socket.id;
    const socketData: SocketData = {
      sessionId,
    };

    // Store session data on socket
    socket.data = socketData;

    // Create/update session in database
    sessionQueries.upsert(sessionId);

    // Join the playing-now room by default
    socket.join('playing-now');

    console.log(`Client connected: ${socket.id} (session: ${sessionId})`);

    // Handle admin authentication via socket
    socket.on('auth:admin', (user: AuthUser) => {
      socketData.user = user;
      socket.join('admin');
      console.log(`Admin joined: ${user.username}`);
    });

    // Ping/heartbeat for keep-alive
    socket.on('ping', () => {
      sessionQueries.updateLastSeen(sessionId);
      socket.emit('pong', {});
    });

    // === Song Control Events (Admin Only) ===

    socket.on('song:set', ({ songId }: { songId: number }) => {
      if (!socketData.user?.isAdmin) return;

      const state = playingStateQueries.update({
        current_song_id: songId,
        current_verse_index: 0,
        current_key_offset: 0,
      });

      io.to('playing-now').emit('song:changed', {
        songId: state.current_song_id,
        verseIndex: state.current_verse_index,
        keyOffset: state.current_key_offset,
        displayMode: state.display_mode,
      });
    });

    socket.on('song:clear', () => {
      if (!socketData.user?.isAdmin) return;

      playingStateQueries.clearSong();
      io.to('playing-now').emit('song:cleared', {});
    });

    socket.on('verse:set', ({ verseIndex }: { verseIndex: number }) => {
      if (!socketData.user?.isAdmin) return;

      playingStateQueries.update({ current_verse_index: verseIndex });
      io.to('playing-now').emit('verse:changed', { verseIndex });
    });

    socket.on('verse:next', () => {
      if (!socketData.user?.isAdmin) return;

      const state = playingStateQueries.get();
      const newIndex = state.current_verse_index + 1;
      playingStateQueries.update({ current_verse_index: newIndex });
      io.to('playing-now').emit('verse:changed', { verseIndex: newIndex });
    });

    socket.on('verse:prev', () => {
      if (!socketData.user?.isAdmin) return;

      const state = playingStateQueries.get();
      const newIndex = Math.max(0, state.current_verse_index - 1);
      playingStateQueries.update({ current_verse_index: newIndex });
      io.to('playing-now').emit('verse:changed', { verseIndex: newIndex });
    });

    socket.on('key:set', ({ keyOffset }: { keyOffset: number }) => {
      if (!socketData.user?.isAdmin) return;

      playingStateQueries.update({ current_key_offset: keyOffset });
      io.to('playing-now').emit('key:changed', { keyOffset });
    });

    socket.on('mode:set', ({ displayMode }: { displayMode: 'lyrics' | 'chords' }) => {
      if (!socketData.user?.isAdmin) return;

      playingStateQueries.update({ display_mode: displayMode });
      io.to('playing-now').emit('mode:changed', { displayMode });
    });

    // === Queue Events ===

    socket.on('queue:add', async ({ songId, requesterName }: { songId: number; requesterName: string }) => {
      const songsIndex = getSongsIndex();
      const song = songsIndex.find(s => s.id === songId);
      
      if (!song || (song.isPrivate && !socketData.user?.isAdmin)) {
        socket.emit('error', { message: 'Song not found' });
        return;
      }

      const count = queueQueries.countBySession(sessionId);
      if (count >= 25) {
        socket.emit('error', { message: 'Queue limit reached (max 25)' });
        return;
      }

      queueQueries.add(songId, requesterName, sessionId);
      
      // Notify admins
      const groupedQueue = queueQueries.getGrouped();
      io.to('admin').emit('queue:updated', { queue: groupedQueue });
    });

    socket.on('queue:remove', ({ queueId }: { queueId: number }) => {
      const removed = queueQueries.remove(queueId, sessionId);
      
      if (removed) {
        const groupedQueue = queueQueries.getGrouped();
        io.to('admin').emit('queue:updated', { queue: groupedQueue });
      }
    });

    socket.on('queue:present', ({ queueId }: { queueId: number }) => {
      if (!socketData.user?.isAdmin) return;

      // Get the queue entry first
      const entries = queueQueries.getAll();
      const entry = entries.find(e => e.id === queueId);
      
      if (!entry) {
        socket.emit('error', { message: 'Queue entry not found' });
        return;
      }

      // Mark as played
      queueQueries.markPlayed(queueId);

      // Set as current song
      const state = playingStateQueries.update({
        current_song_id: entry.song_id,
        current_verse_index: 0,
        current_key_offset: 0,
      });

      // Notify all viewers of song change
      io.to('playing-now').emit('song:changed', {
        songId: state.current_song_id,
        verseIndex: state.current_verse_index,
        keyOffset: state.current_key_offset,
        displayMode: state.display_mode,
      });

      // Notify admins of queue update
      const groupedQueue = queueQueries.getGrouped();
      io.to('admin').emit('queue:updated', { queue: groupedQueue });
    });

    // Admin-only: Delete a single entry from queue
    socket.on('queue:deleteEntry', ({ queueId }: { queueId: number }) => {
      if (!socketData.user?.isAdmin) return;

      const removed = queueQueries.removeById(queueId);
      if (removed) {
        const groupedQueue = queueQueries.getGrouped();
        io.to('admin').emit('queue:updated', { queue: groupedQueue });
      }
    });

    // Admin-only: Delete all entries for a session (delete group)
    socket.on('queue:deleteGroup', ({ sessionId: targetSessionId }: { sessionId: string }) => {
      if (!socketData.user?.isAdmin) return;

      const count = queueQueries.removeBySessionId(targetSessionId);
      if (count > 0) {
        const groupedQueue = queueQueries.getGrouped();
        io.to('admin').emit('queue:updated', { queue: groupedQueue });
      }
    });

    // Admin-only: Clear entire queue
    socket.on('queue:truncate', () => {
      if (!socketData.user?.isAdmin) return;

      queueQueries.truncate();
      const groupedQueue = queueQueries.getGrouped();
      io.to('admin').emit('queue:updated', { queue: groupedQueue });
    });

    // === Projector Events ===

    socket.on('projector:register', ({ width, height, linesPerVerse }: { width: number; height: number; linesPerVerse: number }) => {
      socket.join('projector');
      
      sessionQueries.upsert(sessionId, {
        is_projector: true,
        resolution_width: width,
        resolution_height: height,
        lines_per_verse: linesPerVerse,
      });

      // Check if this is the first projector
      const state = playingStateQueries.get();
      if (!state.projector_width) {
        playingStateQueries.update({
          projector_width: width,
          projector_height: height,
          projector_lines_per_verse: linesPerVerse,
        });
        
        // Notify all clients of projector resolution
        io.to('playing-now').emit('projector:resolution', { width, height, linesPerVerse });
      }
    });

    // === Disconnect ===

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Periodic session cleanup (every 15 minutes)
  setInterval(() => {
    const cleaned = sessionQueries.cleanup();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} stale sessions`);
    }
  }, 15 * 60 * 1000);
}


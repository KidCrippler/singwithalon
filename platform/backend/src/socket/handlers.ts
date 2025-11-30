import { Server, Socket } from 'socket.io';
import { sessionQueries } from '../db/index.js';
import type { AuthUser } from '../types/index.js';

interface SocketData {
  user?: AuthUser;
  sessionId: string;
}

/**
 * Socket handlers - simplified to only handle:
 * - Connection/disconnection
 * - Admin room joining (for receiving broadcasts)
 * - Heartbeat/ping for session keep-alive
 * 
 * All business operations are now REST endpoints.
 * Sockets are only used for server→client broadcasts.
 */
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

    // Join the playing-now room by default (for receiving broadcasts)
    socket.join('playing-now');

    console.log(`Client connected: ${socket.id} (session: ${sessionId})`);

    // Handle admin authentication - joins admin room for queue updates
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


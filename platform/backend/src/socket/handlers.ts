import { Server, Socket } from 'socket.io';
import { sessionQueries, adminQueries } from '../db/index.js';
import { getRoomName } from './index.js';
import type { AuthUser } from '../types/index.js';

interface SocketData {
  user?: AuthUser;
  sessionId: string;
  adminId?: number;  // Room admin ID this socket is connected to
}

interface JoinRoomPayload {
  roomUsername: string;
  sessionId?: string;
  isProjector?: boolean;
}

/**
 * Socket handlers - room-scoped architecture
 * 
 * Socket rooms per admin/room:
 *   room:{adminId}:viewers    - All viewers in this room
 *   room:{adminId}:admin      - Admin of this room (for queue updates)
 *   room:{adminId}:projectors - Projectors for this room
 * 
 * Connection flow:
 * 1. Client connects with { roomUsername, sessionId?, isProjector? }
 * 2. Server resolves username → adminId
 * 3. Client joins appropriate rooms
 * 4. Admin emits 'auth:admin' after login to join admin room
 */
export function setupSocketHandlers(io: Server) {
  io.on('connection', async (socket: Socket) => {
    const socketData: SocketData = {
      sessionId: socket.id,
    };
    socket.data = socketData;

    console.log(`Socket connected: ${socket.id}`);

    // Client must explicitly join a room
    socket.on('join:room', async (payload: JoinRoomPayload) => {
      const { roomUsername, sessionId, isProjector } = payload;
      
      if (!roomUsername) {
        socket.emit('error', { message: 'roomUsername is required' });
        return;
      }

      // Resolve username to admin
      const admin = await adminQueries.getActiveByUsername(roomUsername);
      if (!admin) {
        socket.emit('error', { message: 'Room not found' });
        socket.disconnect();
        return;
      }

      const adminId = admin.id;
      socketData.adminId = adminId;
      socketData.sessionId = sessionId || socket.id;

      // Create/update session in database (room-scoped)
      await sessionQueries.upsert(adminId, socketData.sessionId, {
        is_projector: isProjector,
      });

      // Join viewers room
      const viewersRoom = getRoomName(adminId, 'viewers');
      socket.join(viewersRoom);
      console.log(`Socket ${socket.id} joined ${viewersRoom} (session: ${socketData.sessionId})`);

      // If projector, also join projectors room
      if (isProjector) {
        const projectorsRoom = getRoomName(adminId, 'projectors');
        socket.join(projectorsRoom);
        console.log(`Socket ${socket.id} joined ${projectorsRoom}`);
      }

      // Send confirmation with generated sessionId if needed
      socket.emit('room:joined', { 
        roomUsername: admin.username,
        roomDisplayName: admin.display_name,
        sessionId: socketData.sessionId,
        adminId,
      });
    });

    // Handle admin authentication - joins admin room for queue updates
    socket.on('auth:admin', (user: AuthUser) => {
      socketData.user = user;
      
      // Admin should have already joined via join:room
      // Now also join the admin room for queue updates
      if (socketData.adminId && user.id === socketData.adminId) {
        const adminRoom = getRoomName(socketData.adminId, 'admin');
        socket.join(adminRoom);
        console.log(`Admin ${user.username} joined ${adminRoom}`);
      } else if (socketData.adminId) {
        // Admin trying to control a room they don't own
        console.warn(`Admin ${user.username} (id: ${user.id}) tried to join admin room for room ${socketData.adminId}`);
      }
    });

    // Ping/heartbeat for keep-alive
    socket.on('ping', async () => {
      if (socketData.sessionId) {
        await sessionQueries.updateLastSeen(socketData.sessionId);
      }
      socket.emit('pong', {});
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  // Periodic session cleanup (every 15 minutes)
  setInterval(async () => {
    const cleaned = await sessionQueries.cleanup();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} stale sessions`);
    }
  }, 15 * 60 * 1000);
}

import type { Server as HttpServer } from 'http';
import type { Http2SecureServer } from 'http2';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './handlers.js';

type ServerType = HttpServer | Http2SecureServer;

// Store io instance for access from REST routes
let ioInstance: Server | null = null;

export function initSocketIO(httpServer: ServerType): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
      credentials: true,
    },
  });

  setupSocketHandlers(io);
  ioInstance = io;

  console.log('Socket.io initialized');
  return io;
}

// Get the io instance for use in REST routes
export function getIO(): Server | null {
  return ioInstance;
}

// Helper: Get room name for a given admin and type
export function getRoomName(adminId: number, type: 'viewers' | 'admin' | 'projectors'): string {
  return `room:${adminId}:${type}`;
}

// Helper: Broadcast to a room (used by REST routes)
export function broadcastToRoom(adminId: number, type: 'viewers' | 'admin' | 'projectors', event: string, payload: unknown): void {
  const io = getIO();
  if (!io) return;
  
  const roomName = getRoomName(adminId, type);
  io.to(roomName).emit(event, payload);
}

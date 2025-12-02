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
      origin: process.env.NODE_ENV === 'production' 
        ? false // In production, same-origin only
        : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'], // Dev frontend URLs
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


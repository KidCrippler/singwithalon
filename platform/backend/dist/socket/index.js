import { Server } from 'socket.io';
import { setupSocketHandlers } from './handlers.js';
export function initSocketIO(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? false // In production, same-origin only
                : ['http://localhost:5173', 'http://localhost:3000'], // Dev frontend URLs
            credentials: true,
        },
    });
    setupSocketHandlers(io);
    console.log('Socket.io initialized');
    return io;
}

import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { config } from './config.js';
import { initDatabase } from './db/index.js';
import { authRoutes, authHook } from './routes/auth.js';
import { songsRoutes } from './routes/songs.js';
import { queueRoutes } from './routes/queue.js';
import { stateRoutes } from './routes/state.js';
import { initSocketIO } from './socket/index.js';

async function main() {
  // Initialize database
  initDatabase();

  // Create Fastify instance
  const fastify = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    },
  });

  // Register plugins
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? false
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  await fastify.register(cookie, {
    secret: config.auth.cookieSecret,
  });

  // Add session ID extraction from cookie or generate new one
  fastify.decorateRequest('sessionId', '');
  fastify.addHook('preHandler', async (request) => {
    // Try to get session ID from cookie first
    let sessionId = request.cookies['singalong_viewer_session'];
    
    if (!sessionId) {
      // Generate a new session ID
      sessionId = `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    request.sessionId = sessionId;
  });

  // Register auth hook (adds user to request if authenticated)
  authHook(fastify);

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(songsRoutes);
  await fastify.register(queueRoutes);
  await fastify.register(stateRoutes);

  // Start the server
  try {
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    // Initialize Socket.io with the raw HTTP server
    const server = fastify.server;
    initSocketIO(server);

    console.log(`🎤 SingWithAlon backend running at http://${config.server.host}:${config.server.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();


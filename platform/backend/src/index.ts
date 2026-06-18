import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { config } from './config.js';
import { initDatabase, pingDatabase, startDatabaseHeartbeat } from './db/index.js';
import { authRoutes, authHook } from './routes/auth.js';
import { songsRoutes } from './routes/songs.js';
import { queueRoutes } from './routes/queue.js';
import { stateRoutes } from './routes/state.js';
import { playlistRoutes } from './routes/playlist.js';
import { toolsRoutes } from './routes/tools.js';
import { initSocketIO } from './socket/index.js';
import { resolveSessionId } from './services/session.js';

// Catch failures that would otherwise terminate the process silently. Last time
// the server went down, nothing was logged — these guarantee a trace.
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
});

async function main() {
  // Validate required environment variables
  if (!config.auth.cookieSecret) {
    console.error('❌ COOKIE_SECRET environment variable is required!');
    console.error('   Generate one with: openssl rand -hex 32');
    process.exit(1);
  }

  // Initialize database
  await initDatabase();

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
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true,
  });

  await fastify.register(cookie, {
    secret: config.auth.cookieSecret,
  });

  // Add content-type parser for text/plain (used by sandbox tool)
  fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, (req, body, done) => {
    done(null, body);
  });

  // Add session ID extraction from cookie or generate new one
  fastify.decorateRequest('sessionId', '');
  fastify.addHook('preHandler', async (request, reply) => {
    // Resolve viewer session ID: X-Session-Id header (stable client UUID) takes
    // precedence over the cookie, which avoids fragmenting one device into many
    // sessions when the cross-origin cookie is dropped (mobile Safari/ITP).
    const headerSessionId = Array.isArray(request.headers['x-session-id'])
      ? request.headers['x-session-id'][0]
      : request.headers['x-session-id'];
    const { sessionId, isNew: isNewSession } = resolveSessionId(
      headerSessionId,
      request.cookies['singalong_viewer_session']
    );

    request.sessionId = sessionId;

    // Set/refresh the session cookie (expires in 30 days)
    // Use 'lax' sameSite for better compatibility with older browsers
    // Only use 'none' if explicitly configured for cross-origin deployment
    if (isNewSession) {
      const isProduction = process.env.NODE_ENV === 'production';
      const useCrossOrigin = config.auth.crossOriginCookies && isProduction;
      
      reply.setCookie('singalong_viewer_session', sessionId, {
        path: '/',
        httpOnly: true,
        // 'lax' is more compatible with older browsers
        // 'none' required only for cross-origin (and needs secure: true)
        sameSite: useCrossOrigin ? 'none' : 'lax',
        secure: useCrossOrigin,
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
      });
    }
  });

  // Register auth hook (adds user to request if authenticated)
  authHook(fastify);

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(songsRoutes);
  await fastify.register(queueRoutes);
  await fastify.register(stateRoutes);
  await fastify.register(playlistRoutes);
  await fastify.register(toolsRoutes);

  // Health check — runs a real DB ping so Railway/clients can probe liveness.
  fastify.get('/api/health', async (_request, reply) => {
    try {
      const dbLatencyMs = await pingDatabase();
      return { status: 'ok', dbLatencyMs, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('Health check DB ping failed:', error);
      return reply.status(503).send({ status: 'db_unavailable', timestamp: new Date().toISOString() });
    }
  });

  // Catch-all error handler — logs every unhandled route/preHandler failure with
  // the request context. This covers the bare `await db.execute(...)` calls
  // across all routes, which previously failed without any log line.
  fastify.setErrorHandler((error, request, reply) => {
    console.error(`Request failed: ${request.method} ${request.url} —`, error);
    reply.status(error.statusCode ?? 500).send({ error: error.message || 'Internal server error' });
  });

  // Start the server
  try {
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    // Initialize Socket.io with the raw HTTP server
    const server = fastify.server;
    initSocketIO(server);

    // Confirm DB connectivity at boot and start a low-noise heartbeat so a
    // mid-session DB outage shows up in the logs even when no request is active.
    try {
      const dbLatencyMs = await pingDatabase();
      console.log(`DB connectivity OK (${dbLatencyMs}ms)`);
    } catch (error) {
      console.error('DB connectivity check failed at startup:', error);
    }
    startDatabaseHeartbeat();

    console.log(`🎤 SingWithAlon backend running at http://${config.server.host}:${config.server.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();


import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/cookie';
import bcrypt from 'bcrypt';
import { adminQueries } from '../db/index.js';
import { config } from '../config.js';
import type { AuthUser, Room } from '../types/index.js';

interface LoginBody {
  password: string;  // Username comes from URL param, not body
}

interface RoomParams {
  username: string;
}

// Room resolution middleware - resolves username to adminId
export async function resolveRoom(request: FastifyRequest<{ Params: RoomParams }>, reply: FastifyReply) {
  const { username } = request.params;
  
  if (!username) {
    return reply.status(400).send({ error: 'Room username required' });
  }

  const admin = await adminQueries.getActiveByUsername(username);
  if (!admin) {
    return reply.status(404).send({ error: 'Room not found' });
  }

  // Attach room to request
  request.room = {
    adminId: admin.id,
    username: admin.username,
    displayName: admin.display_name,
  };
}

// Middleware to require admin authentication AND room ownership
export function requireRoomOwner(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!request.user?.isAdmin) {
    reply.status(401).send({ error: 'Admin authentication required' });
    return;
  }
  
  if (!request.room) {
    reply.status(400).send({ error: 'Room context required' });
    return;
  }
  
  // Verify the logged-in admin owns this room
  if (request.user.id !== request.room.adminId) {
    reply.status(403).send({ error: 'Not authorized for this room' });
    return;
  }
  
  done();
}

export async function authRoutes(fastify: FastifyInstance) {
  // Note: Admin seeding is now handled in db/index.ts via syncAdminsFromEnv()

  // Room-scoped login endpoint (strict: only accepts credentials for :username)
  fastify.post<{ Params: RoomParams; Body: LoginBody }>(
    '/api/rooms/:username/auth/login',
    { preHandler: resolveRoom },
    async (request, reply) => {
      const { password } = request.body;
      const room = request.room!;

      if (!password) {
        return reply.status(400).send({ error: 'Password is required' });
      }

      // Get the admin for this room
      const admin = await adminQueries.getActiveByUsername(room.username);
      if (!admin) {
        return reply.status(404).send({ error: 'Room not found' });
      }

      const isValid = await bcrypt.compare(password, admin.password_hash);
      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid credentials' });
      }

      // Set session cookie with admin info
      const sessionData: AuthUser = {
        id: admin.id,
        username: admin.username,
        isAdmin: true,
      };

      reply.setCookie(config.auth.cookieName, JSON.stringify(sessionData), {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        signed: true,
      });

      return { 
        success: true, 
        user: { 
          id: admin.id,
          username: admin.username, 
          displayName: admin.display_name,
          isAdmin: true 
        } 
      };
    }
  );

  // Logout endpoint (global, not room-scoped)
  fastify.post('/api/auth/logout', async (request, reply) => {
    reply.clearCookie(config.auth.cookieName, { path: '/' });
    return { success: true };
  });

  // Check auth status (global)
  fastify.get('/api/auth/me', async (request, reply) => {
    if (request.user) {
      // Get admin details including display_name
      const admin = await adminQueries.getById(request.user.id);
      return { 
        authenticated: true, 
        user: {
          ...request.user,
          displayName: admin?.display_name || null,
        }
      };
    }
    return { authenticated: false };
  });
}

// Auth verification hook - adds user to request if authenticated
export function authHook(fastify: FastifyInstance) {
  fastify.decorateRequest('user', null);
  fastify.decorateRequest('room', null);
  
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const signedCookie = request.cookies[config.auth.cookieName];
      if (signedCookie) {
        const unsignedCookie = request.unsignCookie(signedCookie);
        if (unsignedCookie.valid && unsignedCookie.value) {
          request.user = JSON.parse(unsignedCookie.value) as AuthUser;
        }
      }
    } catch (error) {
      // Invalid cookie - ignore and continue as unauthenticated
      request.user = undefined;
    }
  });
}

// Legacy middleware for backwards compatibility during migration
export function requireAdmin(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!request.user?.isAdmin) {
    reply.status(401).send({ error: 'Admin authentication required' });
    return;
  }
  done();
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/cookie';
import bcrypt from 'bcrypt';
import { adminQueries } from '../db/index.js';
import { config } from '../config.js';
import type { AuthUser } from '../types/index.js';

interface LoginBody {
  username: string;
  password: string;
}

export async function authRoutes(fastify: FastifyInstance) {
  // Initialize admin user if none exists
  fastify.addHook('onReady', async () => {
    if (!adminQueries.exists()) {
      const passwordHash = await bcrypt.hash(config.admin.password, 10);
      adminQueries.create(config.admin.username, passwordHash);
      console.log(`Created default admin user: ${config.admin.username}`);
    }
  });

  // Login endpoint
  fastify.post<{ Body: LoginBody }>('/api/auth/login', async (request, reply) => {
    const { username, password } = request.body;

    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password are required' });
    }

    const admin = adminQueries.getByUsername(username);
    if (!admin) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Set session cookie
    const sessionData: AuthUser = {
      id: admin.id,
      username: admin.username,
      isAdmin: true,
    };

    reply.setCookie(config.auth.cookieName, JSON.stringify(sessionData), {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      signed: true,
    });

    return { success: true, user: { username: admin.username, isAdmin: true } };
  });

  // Logout endpoint
  fastify.post('/api/auth/logout', async (request, reply) => {
    reply.clearCookie(config.auth.cookieName, { path: '/' });
    return { success: true };
  });

  // Check auth status
  fastify.get('/api/auth/me', async (request, reply) => {
    if (request.user) {
      return { authenticated: true, user: request.user };
    }
    return { authenticated: false };
  });
}

// Auth verification hook - adds user to request if authenticated
export function authHook(fastify: FastifyInstance) {
  fastify.decorateRequest('user', null);
  
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

// Middleware to require admin authentication
export function requireAdmin(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!request.user?.isAdmin) {
    reply.status(401).send({ error: 'Admin authentication required' });
    return;
  }
  done();
}


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
  // Seed admin users on startup from ADMIN_USERS env var
  fastify.addHook('onReady', async () => {
    // Seed admins from ADMIN_USERS env var (format: "user1:pass1,user2:pass2")
    if (config.adminUsers) {
      const users = config.adminUsers.split(',').map(u => u.trim()).filter(Boolean);
      for (const userEntry of users) {
        const [username, password] = userEntry.split(':');
        if (username && password && !adminQueries.getByUsername(username)) {
          const passwordHash = await bcrypt.hash(password, 10);
          adminQueries.create(username, passwordHash);
          console.log(`Created admin user: ${username}`);
        }
      }
    }
    
    // Fallback: create default admin if no admins exist and DEFAULT_ADMIN_PASSWORD is set
    if (!adminQueries.exists() && config.defaultAdminPassword) {
      const passwordHash = await bcrypt.hash(config.defaultAdminPassword, 10);
      adminQueries.create('admin', passwordHash);
      console.log('Created default admin user: admin');
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


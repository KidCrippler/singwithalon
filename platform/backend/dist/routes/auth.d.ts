import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/cookie';
export declare function authRoutes(fastify: FastifyInstance): Promise<void>;
export declare function authHook(fastify: FastifyInstance): void;
export declare function requireAdmin(request: FastifyRequest, reply: FastifyReply, done: () => void): void;

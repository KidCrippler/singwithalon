import { FastifyInstance } from 'fastify';
import type { Song } from '../types/index.js';
export declare function getSongsIndex(): Song[];
export declare function loadSongsIndex(): Promise<void>;
export declare function songsRoutes(fastify: FastifyInstance): Promise<void>;

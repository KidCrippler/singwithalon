import Database from 'better-sqlite3';
import type { Admin, QueueEntry, PlayingState, Session, GroupedQueue } from '../types/index.js';
export declare function initDatabase(): Database.Database;
export declare function getDb(): Database.Database;
export declare const adminQueries: {
    getByUsername(username: string): Admin | undefined;
    create(username: string, passwordHash: string): Admin;
    exists(): boolean;
};
export declare const queueQueries: {
    add(songId: number, requesterName: string, sessionId: string): QueueEntry;
    remove(id: number, sessionId: string): boolean;
    markPlayed(id: number): void;
    getAll(): QueueEntry[];
    getGrouped(): GroupedQueue[];
    countBySession(sessionId: string): number;
    getBySession(sessionId: string): QueueEntry[];
    removeById(id: number): boolean;
    removeBySessionId(sessionId: string): number;
    truncate(): number;
};
export declare const playingStateQueries: {
    get(): PlayingState;
    update(updates: Partial<Omit<PlayingState, "id">>): PlayingState;
    clearSong(): PlayingState;
};
export declare const sessionQueries: {
    upsert(sessionId: string, updates?: Partial<Session>): Session;
    updateLastSeen(sessionId: string): void;
    cleanup(): number;
    get(sessionId: string): Session | undefined;
};

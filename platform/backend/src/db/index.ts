import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import type { Admin, QueueEntry, PlayingState, Session, GroupedQueue } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Database.Database;

export function initDatabase(): Database.Database {
  // Ensure database directory exists
  const dbDir = dirname(config.database.path);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(config.database.path);
  db.pragma('journal_mode = WAL');

  // Run schema
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schema);

  console.log(`Database initialized at ${config.database.path}`);
  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Admin queries
export const adminQueries = {
  getByUsername(username: string): Admin | undefined {
    return getDb().prepare('SELECT * FROM admins WHERE username = ?').get(username) as Admin | undefined;
  },

  create(username: string, passwordHash: string): Admin {
    const result = getDb().prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
    return { id: result.lastInsertRowid as number, username, password_hash: passwordHash, created_at: new Date().toISOString() };
  },

  exists(): boolean {
    const count = getDb().prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
    return count.count > 0;
  },
};

// Queue queries
export const queueQueries = {
  add(songId: number, requesterName: string, sessionId: string): QueueEntry {
    const result = getDb().prepare(
      'INSERT INTO queue (song_id, requester_name, session_id) VALUES (?, ?, ?)'
    ).run(songId, requesterName, sessionId);
    
    return getDb().prepare('SELECT * FROM queue WHERE id = ?').get(result.lastInsertRowid) as QueueEntry;
  },

  remove(id: number, sessionId: string): boolean {
    const result = getDb().prepare('DELETE FROM queue WHERE id = ? AND session_id = ?').run(id, sessionId);
    return result.changes > 0;
  },

  markPlayed(id: number): void {
    getDb().prepare(
      'UPDATE queue SET status = ?, played_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run('played', id);
  },

  getAll(): QueueEntry[] {
    return getDb().prepare('SELECT * FROM queue ORDER BY created_at ASC').all() as QueueEntry[];
  },

  getGrouped(): GroupedQueue[] {
    const entries = this.getAll();
    const groups = new Map<string, GroupedQueue>();

    for (const entry of entries) {
      const key = `${entry.requester_name}|${entry.session_id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          requesterName: entry.requester_name,
          sessionId: entry.session_id,
          entries: [],
          firstRequestTime: entry.created_at,
        });
      }
      groups.get(key)!.entries.push(entry);
    }

    // Sort groups by first request time, then sort entries within groups
    return Array.from(groups.values())
      .sort((a, b) => new Date(a.firstRequestTime).getTime() - new Date(b.firstRequestTime).getTime())
      .map(group => ({
        ...group,
        entries: group.entries.sort((a, b) => {
          // Pending first, then by created_at
          if (a.status !== b.status) {
            return a.status === 'pending' ? -1 : 1;
          }
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }),
      }));
  },

  countBySession(sessionId: string): number {
    const result = getDb().prepare(
      'SELECT COUNT(*) as count FROM queue WHERE session_id = ? AND status = ?'
    ).get(sessionId, 'pending') as { count: number };
    return result.count;
  },

  getBySession(sessionId: string): QueueEntry[] {
    return getDb().prepare(
      'SELECT * FROM queue WHERE session_id = ? ORDER BY created_at ASC'
    ).all(sessionId) as QueueEntry[];
  },

  // Admin-only: Remove any entry by ID (no session check)
  removeById(id: number): boolean {
    const result = getDb().prepare('DELETE FROM queue WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // Admin-only: Remove all entries for a session (delete group)
  removeBySessionId(sessionId: string): number {
    const result = getDb().prepare('DELETE FROM queue WHERE session_id = ?').run(sessionId);
    return result.changes;
  },

  // Admin-only: Clear entire queue
  truncate(): number {
    const result = getDb().prepare('DELETE FROM queue').run();
    return result.changes;
  },
};

// Playing state queries
export const playingStateQueries = {
  get(): PlayingState {
    return getDb().prepare('SELECT * FROM playing_state WHERE id = 1').get() as PlayingState;
  },

  update(updates: Partial<Omit<PlayingState, 'id'>>): PlayingState {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.current_song_id !== undefined) {
      fields.push('current_song_id = ?');
      values.push(updates.current_song_id);
    }
    if (updates.current_verse_index !== undefined) {
      fields.push('current_verse_index = ?');
      values.push(updates.current_verse_index);
    }
    if (updates.current_key_offset !== undefined) {
      fields.push('current_key_offset = ?');
      values.push(updates.current_key_offset);
    }
    if (updates.display_mode !== undefined) {
      fields.push('display_mode = ?');
      values.push(updates.display_mode);
    }
    if (updates.projector_width !== undefined) {
      fields.push('projector_width = ?');
      values.push(updates.projector_width);
    }
    if (updates.projector_height !== undefined) {
      fields.push('projector_height = ?');
      values.push(updates.projector_height);
    }
    if (updates.projector_lines_per_verse !== undefined) {
      fields.push('projector_lines_per_verse = ?');
      values.push(updates.projector_lines_per_verse);
    }

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      getDb().prepare(`UPDATE playing_state SET ${fields.join(', ')} WHERE id = 1`).run(...values);
    }

    return this.get();
  },

  clearSong(): PlayingState {
    return this.update({
      current_song_id: null,
      current_verse_index: 0,
      current_key_offset: 0,
    });
  },
};

// Session queries
export const sessionQueries = {
  upsert(sessionId: string, updates?: Partial<Session>): Session {
    const existing = getDb().prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as Session | undefined;
    
    if (existing) {
      const fields: string[] = ['last_seen = CURRENT_TIMESTAMP'];
      const values: unknown[] = [];

      if (updates?.requester_name !== undefined) {
        fields.push('requester_name = ?');
        values.push(updates.requester_name);
      }
      if (updates?.is_projector !== undefined) {
        fields.push('is_projector = ?');
        values.push(updates.is_projector ? 1 : 0);
      }
      if (updates?.resolution_width !== undefined) {
        fields.push('resolution_width = ?');
        values.push(updates.resolution_width);
      }
      if (updates?.resolution_height !== undefined) {
        fields.push('resolution_height = ?');
        values.push(updates.resolution_height);
      }
      if (updates?.lines_per_verse !== undefined) {
        fields.push('lines_per_verse = ?');
        values.push(updates.lines_per_verse);
      }

      values.push(sessionId);
      getDb().prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE session_id = ?`).run(...values);
    } else {
      getDb().prepare(
        'INSERT INTO sessions (session_id, requester_name, is_projector, resolution_width, resolution_height, lines_per_verse) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(
        sessionId,
        updates?.requester_name ?? null,
        updates?.is_projector ? 1 : 0,
        updates?.resolution_width ?? null,
        updates?.resolution_height ?? null,
        updates?.lines_per_verse ?? null
      );
    }

    return getDb().prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as Session;
  },

  updateLastSeen(sessionId: string): void {
    getDb().prepare('UPDATE sessions SET last_seen = CURRENT_TIMESTAMP WHERE session_id = ?').run(sessionId);
  },

  cleanup(): number {
    const result = getDb().prepare("DELETE FROM sessions WHERE last_seen < datetime('now', '-3 hours')").run();
    return result.changes;
  },

  get(sessionId: string): Session | undefined {
    return getDb().prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as Session | undefined;
  },
};


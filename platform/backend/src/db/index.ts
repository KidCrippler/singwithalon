import { createClient, Client, InStatement, InValue } from '@libsql/client';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import type { Admin, QueueEntry, PlayingState, Session, GroupedQueue } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Client;

export async function initDatabase(): Promise<Client> {
  if (config.database.useTurso) {
    // Production: Connect to Turso
    console.log('Connecting to Turso database...');
    db = createClient({
      url: config.database.tursoUrl,
      authToken: config.database.tursoAuthToken,
    });
    console.log('Connected to Turso database');
  } else {
    // Development: Use local SQLite file
    const dbPath = config.database.localPath;
    const dbDir = dirname(dbPath);
    
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    console.log(`Using local SQLite database at ${dbPath}`);
    db = createClient({
      url: `file:${dbPath}`,
    });
  }

  // Run schema
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  
  // Split schema into individual statements and execute each
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  for (const statement of statements) {
    await db.execute(statement);
  }

  console.log('Database schema initialized');
  return db;
}

export function getDb(): Client {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Helper to convert LibSQL row to typed object
function rowToObject<T>(row: Record<string, unknown>): T {
  return row as T;
}

// Admin queries
export const adminQueries = {
  async getByUsername(username: string): Promise<Admin | undefined> {
    const result = await getDb().execute({
      sql: 'SELECT * FROM admins WHERE username = ?',
      args: [username],
    });
    return result.rows[0] ? rowToObject<Admin>(result.rows[0] as Record<string, unknown>) : undefined;
  },

  async create(username: string, passwordHash: string): Promise<Admin> {
    const result = await getDb().execute({
      sql: 'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
      args: [username, passwordHash],
    });
    return {
      id: Number(result.lastInsertRowid),
      username,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };
  },

  async updatePassword(username: string, passwordHash: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: 'UPDATE admins SET password_hash = ? WHERE username = ?',
      args: [passwordHash, username],
    });
    return (result.rowsAffected ?? 0) > 0;
  },

  async exists(): Promise<boolean> {
    const result = await getDb().execute('SELECT COUNT(*) as count FROM admins');
    const count = (result.rows[0] as Record<string, unknown>)?.count as number;
    return count > 0;
  },

  async deleteByUsername(username: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: 'DELETE FROM admins WHERE username = ?',
      args: [username],
    });
    return (result.rowsAffected ?? 0) > 0;
  },
};

// Queue queries
export const queueQueries = {
  async add(songId: number, requesterName: string, sessionId: string, notes?: string): Promise<QueueEntry> {
    const result = await getDb().execute({
      sql: 'INSERT INTO queue (song_id, requester_name, session_id, notes) VALUES (?, ?, ?, ?)',
      args: [songId, requesterName, sessionId, notes || null],
    });
    
    const entry = await getDb().execute({
      sql: 'SELECT * FROM queue WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    });
    return rowToObject<QueueEntry>(entry.rows[0] as Record<string, unknown>);
  },

  async remove(id: number, sessionId: string): Promise<boolean> {
    const result = await getDb().execute({
      sql: 'DELETE FROM queue WHERE id = ? AND session_id = ?',
      args: [id, sessionId],
    });
    return (result.rowsAffected ?? 0) > 0;
  },

  async markPlayed(id: number): Promise<void> {
    await getDb().execute({
      sql: 'UPDATE queue SET status = ?, played_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: ['played', id],
    });
  },

  async getAll(): Promise<QueueEntry[]> {
    const result = await getDb().execute('SELECT * FROM queue ORDER BY created_at ASC');
    return result.rows.map(row => rowToObject<QueueEntry>(row as Record<string, unknown>));
  },

  async getGrouped(): Promise<GroupedQueue[]> {
    const entries = await this.getAll();
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

  async countBySession(sessionId: string): Promise<number> {
    const result = await getDb().execute({
      sql: 'SELECT COUNT(*) as count FROM queue WHERE session_id = ? AND status = ?',
      args: [sessionId, 'pending'],
    });
    return (result.rows[0] as Record<string, unknown>)?.count as number ?? 0;
  },

  async getBySession(sessionId: string): Promise<QueueEntry[]> {
    const result = await getDb().execute({
      sql: 'SELECT * FROM queue WHERE session_id = ? ORDER BY created_at ASC',
      args: [sessionId],
    });
    return result.rows.map(row => rowToObject<QueueEntry>(row as Record<string, unknown>));
  },

  // Admin-only: Remove any entry by ID (no session check)
  async removeById(id: number): Promise<boolean> {
    const result = await getDb().execute({
      sql: 'DELETE FROM queue WHERE id = ?',
      args: [id],
    });
    return (result.rowsAffected ?? 0) > 0;
  },

  // Admin-only: Remove all entries for a session+requester group
  async removeByGroup(sessionId: string, requesterName: string): Promise<number> {
    const result = await getDb().execute({
      sql: 'DELETE FROM queue WHERE session_id = ? AND requester_name = ?',
      args: [sessionId, requesterName],
    });
    return result.rowsAffected ?? 0;
  },

  // Admin-only: Clear entire queue
  async truncate(): Promise<number> {
    const result = await getDb().execute('DELETE FROM queue');
    return result.rowsAffected ?? 0;
  },

  // Get distinct song IDs by status (for search view coloring)
  async getPendingSongIds(): Promise<number[]> {
    const result = await getDb().execute("SELECT DISTINCT song_id FROM queue WHERE status = 'pending'");
    return result.rows.map(row => (row as Record<string, unknown>).song_id as number);
  },

  async getPlayedSongIds(): Promise<number[]> {
    const result = await getDb().execute("SELECT DISTINCT song_id FROM queue WHERE status = 'played'");
    return result.rows.map(row => (row as Record<string, unknown>).song_id as number);
  },

  // Mark a song as played (for "Present Now" - not from queue)
  async markSongPlayed(songId: number): Promise<void> {
    // Check if there's already a played entry for this song
    const existing = await getDb().execute({
      sql: "SELECT id FROM queue WHERE song_id = ? AND status = 'played' LIMIT 1",
      args: [songId],
    });
    
    if (existing.rows.length === 0) {
      // Add a system entry to track that this song was played
      await getDb().execute({
        sql: "INSERT INTO queue (song_id, requester_name, session_id, status, played_at) VALUES (?, ?, ?, 'played', CURRENT_TIMESTAMP)",
        args: [songId, '__SYSTEM__', '__SYSTEM__'],
      });
    }
  },
};

// Playing state queries
export const playingStateQueries = {
  async get(): Promise<PlayingState> {
    const result = await getDb().execute('SELECT * FROM playing_state WHERE id = 1');
    return rowToObject<PlayingState>(result.rows[0] as Record<string, unknown>);
  },

  async update(updates: Partial<Omit<PlayingState, 'id'>>): Promise<PlayingState> {
    const fields: string[] = [];
    const values: InValue[] = [];

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
    if (updates.verses_enabled !== undefined) {
      fields.push('verses_enabled = ?');
      values.push(updates.verses_enabled);
    }

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      await getDb().execute({
        sql: `UPDATE playing_state SET ${fields.join(', ')} WHERE id = 1`,
        args: values,
      });
    }

    return this.get();
  },

  async clearSong(): Promise<PlayingState> {
    return this.update({
      current_song_id: null,
      current_verse_index: 0,
      current_key_offset: 0,
    });
  },
};

// Session queries
export const sessionQueries = {
  async upsert(sessionId: string, updates?: Partial<Session>): Promise<Session> {
    const existingResult = await getDb().execute({
      sql: 'SELECT * FROM sessions WHERE session_id = ?',
      args: [sessionId],
    });
    const existing = existingResult.rows[0] as Record<string, unknown> | undefined;
    
    if (existing) {
      const fields: string[] = ['last_seen = CURRENT_TIMESTAMP'];
      const values: InValue[] = [];

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
      await getDb().execute({
        sql: `UPDATE sessions SET ${fields.join(', ')} WHERE session_id = ?`,
        args: values,
      });
    } else {
      await getDb().execute({
        sql: 'INSERT INTO sessions (session_id, requester_name, is_projector, resolution_width, resolution_height, lines_per_verse) VALUES (?, ?, ?, ?, ?, ?)',
        args: [
          sessionId,
          updates?.requester_name ?? null,
          updates?.is_projector ? 1 : 0,
          updates?.resolution_width ?? null,
          updates?.resolution_height ?? null,
          updates?.lines_per_verse ?? null,
        ],
      });
    }

    const result = await getDb().execute({
      sql: 'SELECT * FROM sessions WHERE session_id = ?',
      args: [sessionId],
    });
    return rowToObject<Session>(result.rows[0] as Record<string, unknown>);
  },

  async updateLastSeen(sessionId: string): Promise<void> {
    await getDb().execute({
      sql: 'UPDATE sessions SET last_seen = CURRENT_TIMESTAMP WHERE session_id = ?',
      args: [sessionId],
    });
  },

  async cleanup(): Promise<number> {
    const result = await getDb().execute("DELETE FROM sessions WHERE last_seen < datetime('now', '-3 hours')");
    return result.rowsAffected ?? 0;
  },

  async get(sessionId: string): Promise<Session | undefined> {
    const result = await getDb().execute({
      sql: 'SELECT * FROM sessions WHERE session_id = ?',
      args: [sessionId],
    });
    return result.rows[0] ? rowToObject<Session>(result.rows[0] as Record<string, unknown>) : undefined;
  },
};

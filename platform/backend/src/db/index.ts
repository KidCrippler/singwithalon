import { createClient, Client, InValue } from '@libsql/client';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { config } from '../config.js';
import type { Admin, QueueEntry, PlayingState, Session, GroupedQueue, Song } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db: Client;

// Check if database has any data
async function databaseHasData(): Promise<boolean> {
  try {
    const result = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='admins'");
    if (result.rows.length === 0) return false;
    
    const adminsCount = await db.execute('SELECT COUNT(*) as count FROM admins');
    return ((adminsCount.rows[0] as Record<string, unknown>)?.count as number) > 0;
  } catch {
    return false;
  }
}

// Drop all tables for RESET_DB
async function dropAllTables(): Promise<void> {
  console.log('Dropping all tables...');
  // Order matters due to foreign keys
  await db.execute('DROP TABLE IF EXISTS songs');
  await db.execute('DROP TABLE IF EXISTS song_analytics');
  await db.execute('DROP TABLE IF EXISTS sessions');
  await db.execute('DROP TABLE IF EXISTS queue');
  await db.execute('DROP TABLE IF EXISTS playing_state');
  await db.execute('DROP TABLE IF EXISTS admins');
  console.log('All tables dropped.');
}

// Sync admins from ADMIN_USERS env var
async function syncAdminsFromEnv(): Promise<void> {
  if (!config.adminUsers) {
    console.log('No ADMIN_USERS configured, skipping admin sync.');
    return;
  }

  const adminEntries = config.adminUsers.split(',').filter(e => e.includes(':'));
  console.log(`Syncing ${adminEntries.length} admin(s) from ADMIN_USERS...`);

  for (const entry of adminEntries) {
    const [username, password] = entry.split(':');
    if (!username || !password) continue;

    const existing = await adminQueries.getByUsername(username);
    const passwordHash = await bcrypt.hash(password, 10);

    if (existing) {
      // Update password hash if needed
      await db.execute({
        sql: 'UPDATE admins SET password_hash = ? WHERE username = ?',
        args: [passwordHash, username],
      });
      console.log(`  Updated admin: ${username}`);
    } else {
      // Create new admin with display_name
      const displayName = `שרים עם ${username}`;
      const result = await db.execute({
        sql: 'INSERT INTO admins (username, password_hash, display_name, is_active) VALUES (?, ?, ?, TRUE)',
        args: [username, passwordHash, displayName],
      });
      
      // Create playing_state for new admin
      const adminId = Number(result.lastInsertRowid);
      await db.execute({
        sql: 'INSERT INTO playing_state (admin_id) VALUES (?)',
        args: [adminId],
      });
      console.log(`  Created admin: ${username} (id: ${adminId})`);
    }
  }
}

export async function initDatabase(): Promise<Client> {
  // Connect to database
  if (config.database.useTurso) {
    console.log('Connecting to Turso database...');
    db = createClient({
      url: config.database.tursoUrl,
      authToken: config.database.tursoAuthToken,
    });
    console.log('Connected to Turso database');
  } else {
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

  // Handle RESET_DB - allows wiping and recreating the database
  const resetDb = config.database.resetDb;
  if (resetDb === 'true' || resetDb === 'CONFIRM') {
    const hasData = await databaseHasData();
    
    if (resetDb === 'true' && hasData) {
      console.error('❌ RESET_DB=true but database has data.');
      console.error('   Set RESET_DB=CONFIRM to force reset, or remove RESET_DB to keep data.');
      process.exit(1);
    }
    
    if (resetDb === 'CONFIRM' || !hasData) {
      console.log('RESET_DB enabled - recreating database schema...');
      await dropAllTables();
    }
  }

  // Run schema (CREATE TABLE IF NOT EXISTS)
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  for (const statement of statements) {
    await db.execute(statement);
  }

  console.log('Database schema initialized');

  // Sync admins from env var
  await syncAdminsFromEnv();

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

  async getActiveByUsername(username: string): Promise<Admin | undefined> {
    const result = await getDb().execute({
      sql: 'SELECT * FROM admins WHERE username = ? AND is_active = TRUE',
      args: [username],
    });
    return result.rows[0] ? rowToObject<Admin>(result.rows[0] as Record<string, unknown>) : undefined;
  },

  async getById(id: number): Promise<Admin | undefined> {
    const result = await getDb().execute({
      sql: 'SELECT * FROM admins WHERE id = ?',
      args: [id],
    });
    return result.rows[0] ? rowToObject<Admin>(result.rows[0] as Record<string, unknown>) : undefined;
  },

  async create(username: string, passwordHash: string, displayName?: string): Promise<Admin> {
    const result = await getDb().execute({
      sql: 'INSERT INTO admins (username, password_hash, display_name, is_active) VALUES (?, ?, ?, TRUE)',
      args: [username, passwordHash, displayName || `שרים עם ${username}`],
    });
    
    const adminId = Number(result.lastInsertRowid);
    
    // Create playing_state for new admin
    await getDb().execute({
      sql: 'INSERT INTO playing_state (admin_id) VALUES (?)',
      args: [adminId],
    });
    
    return {
      id: adminId,
      username,
      password_hash: passwordHash,
      display_name: displayName || `שרים עם ${username}`,
      is_active: true,
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
};

// Queue queries (room-scoped)
export const queueQueries = {
  async add(adminId: number, songId: number, requesterName: string, sessionId: string, notes?: string): Promise<QueueEntry> {
    const result = await getDb().execute({
      sql: 'INSERT INTO queue (admin_id, song_id, requester_name, session_id, notes) VALUES (?, ?, ?, ?, ?)',
      args: [adminId, songId, requesterName, sessionId, notes || null],
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

  async getAll(adminId: number): Promise<QueueEntry[]> {
    const result = await getDb().execute({
      sql: 'SELECT * FROM queue WHERE admin_id = ? ORDER BY created_at ASC',
      args: [adminId],
    });
    return result.rows.map(row => rowToObject<QueueEntry>(row as Record<string, unknown>));
  },

  async getGrouped(adminId: number): Promise<GroupedQueue[]> {
    const entries = await this.getAll(adminId);
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

  async countBySession(adminId: number, sessionId: string): Promise<number> {
    const result = await getDb().execute({
      sql: 'SELECT COUNT(*) as count FROM queue WHERE admin_id = ? AND session_id = ? AND status = ?',
      args: [adminId, sessionId, 'pending'],
    });
    return (result.rows[0] as Record<string, unknown>)?.count as number ?? 0;
  },

  async getBySession(adminId: number, sessionId: string): Promise<QueueEntry[]> {
    const result = await getDb().execute({
      sql: 'SELECT * FROM queue WHERE admin_id = ? AND session_id = ? ORDER BY created_at ASC',
      args: [adminId, sessionId],
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
  async removeByGroup(adminId: number, sessionId: string, requesterName: string): Promise<number> {
    const result = await getDb().execute({
      sql: 'DELETE FROM queue WHERE admin_id = ? AND session_id = ? AND requester_name = ?',
      args: [adminId, sessionId, requesterName],
    });
    return result.rowsAffected ?? 0;
  },

  // Admin-only: Clear entire queue for a room
  async truncate(adminId: number): Promise<number> {
    const result = await getDb().execute({
      sql: 'DELETE FROM queue WHERE admin_id = ?',
      args: [adminId],
    });
    return result.rowsAffected ?? 0;
  },

  // Get distinct song IDs by status for a room (for search view coloring)
  async getPendingSongIds(adminId: number): Promise<number[]> {
    const result = await getDb().execute({
      sql: "SELECT DISTINCT song_id FROM queue WHERE admin_id = ? AND status = 'pending'",
      args: [adminId],
    });
    return result.rows.map(row => (row as Record<string, unknown>).song_id as number);
  },

  async getPlayedSongIds(adminId: number): Promise<number[]> {
    const result = await getDb().execute({
      sql: "SELECT DISTINCT song_id FROM queue WHERE admin_id = ? AND status = 'played'",
      args: [adminId],
    });
    return result.rows.map(row => (row as Record<string, unknown>).song_id as number);
  },

  // Mark a song as played (for "Present Now" - not from queue)
  async markSongPlayed(adminId: number, songId: number): Promise<void> {
    // Check if there's already a played entry for this song in this room
    const existing = await getDb().execute({
      sql: "SELECT id FROM queue WHERE admin_id = ? AND song_id = ? AND status = 'played' LIMIT 1",
      args: [adminId, songId],
    });
    
    if (existing.rows.length === 0) {
      // Add a system entry to track that this song was played
      await getDb().execute({
        sql: "INSERT INTO queue (admin_id, song_id, requester_name, session_id, status, played_at) VALUES (?, ?, ?, ?, 'played', CURRENT_TIMESTAMP)",
        args: [adminId, songId, '__SYSTEM__', '__SYSTEM__'],
      });
    }
  },
};

// Playing state queries (room-scoped)
export const playingStateQueries = {
  async get(adminId: number): Promise<PlayingState | undefined> {
    const result = await getDb().execute({
      sql: 'SELECT * FROM playing_state WHERE admin_id = ?',
      args: [adminId],
    });
    return result.rows[0] ? rowToObject<PlayingState>(result.rows[0] as Record<string, unknown>) : undefined;
  },

  async update(adminId: number, updates: Partial<Omit<PlayingState, 'id' | 'admin_id'>>): Promise<PlayingState | undefined> {
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
      values.push(adminId);
      await getDb().execute({
        sql: `UPDATE playing_state SET ${fields.join(', ')} WHERE admin_id = ?`,
        args: values,
      });
    }

    return this.get(adminId);
  },

  async clearSong(adminId: number): Promise<PlayingState | undefined> {
    return this.update(adminId, {
      current_song_id: null,
      current_verse_index: 0,
      current_key_offset: 0,
    });
  },

  async isSongCurrentlyPlaying(songId: number): Promise<boolean> {
    const result = await getDb().execute({
      sql: 'SELECT COUNT(*) as count FROM playing_state WHERE current_song_id = ?',
      args: [songId],
    });
    const count = (result.rows[0] as Record<string, unknown>)?.count as number ?? 0;
    return count > 0;
  },
};

// Session queries (room-scoped)
export const sessionQueries = {
  async upsert(adminId: number, sessionId: string, updates?: Partial<Omit<Session, 'session_id' | 'admin_id'>>): Promise<Session> {
    const existingResult = await getDb().execute({
      sql: 'SELECT * FROM sessions WHERE session_id = ?',
      args: [sessionId],
    });
    const existing = existingResult.rows[0] as Record<string, unknown> | undefined;
    
    if (existing) {
      const fields: string[] = [];
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

      // Only update if there are fields to update
      if (fields.length > 0) {
        values.push(sessionId);
        await getDb().execute({
          sql: `UPDATE sessions SET ${fields.join(', ')} WHERE session_id = ?`,
          args: values,
        });
      }
    } else {
      await getDb().execute({
        sql: 'INSERT INTO sessions (session_id, admin_id, requester_name, is_projector, resolution_width, resolution_height, lines_per_verse) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [
          sessionId,
          adminId,
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

// Sync songs from in-memory index to database (non-blocking)
// Called after loading songs.json on startup and on admin refresh
export async function syncSongsToDatabase(songs: Song[]): Promise<void> {
  try {
    const startTime = Date.now();
    
    // Delete all existing songs (table always mirrors JSON exactly)
    await getDb().execute('DELETE FROM songs');
    
    // Batch insert all songs
    let syncedCount = 0;
    let skippedCount = 0;
    
    for (const song of songs) {
      // Skip songs without required fields (id, name, singer)
      if (!song.id || !song.name || !song.singer) {
        skippedCount++;
        continue;
      }
      
      await getDb().execute({
        sql: `INSERT INTO songs (id, name, artist, composers, lyricists, translators, 
              category_ids, is_private, markup_url, direction, date_created, date_modified) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          song.id,
          song.name,
          song.singer,  // Maps to 'artist' column
          JSON.stringify(song.composers ?? []),
          JSON.stringify(song.lyricists ?? []),
          JSON.stringify(song.translators ?? []),
          JSON.stringify(song.categoryIds ?? []),
          song.isPrivate ? 1 : 0,
          song.lyrics?.markupUrl ?? null,
          song.direction ?? null,
          song.dateCreated ?? null,
          song.dateModified ?? null,
        ],
      });
      syncedCount++;
    }
    
    const duration = Date.now() - startTime;
    if (skippedCount > 0) {
      console.log(`Synced ${syncedCount} songs to database in ${duration}ms (skipped ${skippedCount} invalid)`);
    } else {
      console.log(`Synced ${syncedCount} songs to database in ${duration}ms`);
    }
  } catch (error) {
    console.error('Failed to sync songs to database:', error);
  }
}

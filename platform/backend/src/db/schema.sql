-- Multi-tenant schema: User-as-Room architecture
-- Each admin user owns their own isolated "room"

-- Admin users (represents "rooms")
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,                    -- "שרים עם אלון" shown in UI
  is_active BOOLEAN DEFAULT TRUE,       -- Soft delete flag
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Per-room playing state
CREATE TABLE IF NOT EXISTS playing_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
  current_song_id INTEGER,              -- NULL if no song playing
  current_verse_index INTEGER DEFAULT 0,
  current_key_offset INTEGER DEFAULT 0, -- Semitones (can be negative)
  display_mode TEXT DEFAULT 'lyrics',   -- 'lyrics' | 'chords'
  verses_enabled INTEGER DEFAULT 1,     -- 0 = off, 1 = on (verse mode)
  projector_width INTEGER,              -- First projector's resolution
  projector_height INTEGER,
  projector_lines_per_verse INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Per-room queue entries
CREATE TABLE IF NOT EXISTS queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL,
  requester_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  notes TEXT,  -- Optional notes from viewer (max 50 chars, enforced by API)
  status TEXT DEFAULT 'pending',  -- 'pending' | 'played'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  played_at DATETIME
);

-- Per-room viewer sessions
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  requester_name TEXT,
  is_projector BOOLEAN DEFAULT FALSE,
  resolution_width INTEGER,
  resolution_height INTEGER,
  lines_per_verse INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient room-scoped queries
CREATE INDEX IF NOT EXISTS idx_playing_state_admin ON playing_state(admin_id);
CREATE INDEX IF NOT EXISTS idx_queue_admin ON queue(admin_id);
CREATE INDEX IF NOT EXISTS idx_queue_session_id ON queue(session_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
CREATE INDEX IF NOT EXISTS idx_sessions_admin ON sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_admins_active ON admins(is_active);

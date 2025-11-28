-- Admin users
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Queue entries
CREATE TABLE IF NOT EXISTS queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id INTEGER NOT NULL,
  requester_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'played'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  played_at DATETIME
);

-- Playing state (singleton row - always id=1)
CREATE TABLE IF NOT EXISTS playing_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_song_id INTEGER,              -- NULL if no song playing
  current_verse_index INTEGER DEFAULT 0,
  current_key_offset INTEGER DEFAULT 0, -- Semitones (can be negative)
  display_mode TEXT DEFAULT 'lyrics',   -- 'lyrics' | 'chords'
  verses_enabled INTEGER DEFAULT 0,     -- 0 = off (default), 1 = on
  projector_width INTEGER,              -- First projector's resolution
  projector_height INTEGER,
  projector_lines_per_verse INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize singleton row
INSERT OR IGNORE INTO playing_state (id) VALUES (1);

-- Viewer sessions (for tracking requesters and projectors)
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  requester_name TEXT,
  is_projector BOOLEAN DEFAULT FALSE,
  resolution_width INTEGER,
  resolution_height INTEGER,
  lines_per_verse INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_queue_session_id ON queue(session_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
CREATE INDEX IF NOT EXISTS idx_sessions_last_seen ON sessions(last_seen);


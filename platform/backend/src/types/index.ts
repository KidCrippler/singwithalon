// Import @fastify/cookie types to augment FastifyRequest/FastifyReply
import '@fastify/cookie';

// Song types
export interface Song {
  id: number;
  name: string;
  singer: string;
  composers?: string[];
  lyricists?: string[];
  translators?: string[];
  isPrivate?: boolean;
  playback?: {
    youTubeVideoId?: string;
  };
  categoryIds?: string[];
  lyrics: {
    markupUrl: string;
  };
  direction?: 'ltr' | 'rtl';
  dateCreated?: number;
  dateModified?: number;
}

// Parsed song line types
// directive = {} brackets (green, chords mode only)
// cue = [] brackets with non-chord text (red, both modes)
export type LineType = 'directive' | 'cue' | 'chords' | 'lyric' | 'empty';

export interface ParsedLine {
  type: LineType;
  text: string;
  raw?: string; // Original text before processing
}

export interface SongMetadata {
  title: string;
  artist: string;
  credits: string;
  direction: 'ltr' | 'rtl';
}

export interface ParsedSong {
  metadata: SongMetadata;
  lines: ParsedLine[];
  // Note: verseBreaks removed - verse calculation now handled by frontend
}

// Database types
export interface Admin {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface QueueEntry {
  id: number;
  song_id: number;
  requester_name: string;
  session_id: string;
  notes: string | null;  // Optional notes from viewer (max 50 chars)
  status: 'pending' | 'played';
  created_at: string;
  played_at: string | null;
}

export interface PlayingState {
  id: number;
  current_song_id: number | null;
  current_verse_index: number;
  current_key_offset: number;
  display_mode: 'lyrics' | 'chords';
  verses_enabled: number; // 0 = off, 1 = on
  projector_width: number | null;
  projector_height: number | null;
  projector_lines_per_verse: number | null;
  updated_at: string;
}

export interface Session {
  session_id: string;
  requester_name: string | null;
  is_projector: boolean;
  resolution_width: number | null;
  resolution_height: number | null;
  lines_per_verse: number | null;
  created_at: string;
  last_seen: string;
}

// Socket event payloads
export interface SongChangedPayload {
  songId: number;
  verseIndex: number;
  keyOffset: number;
  displayMode: 'lyrics' | 'chords';
  versesEnabled: boolean;
}

export interface VersesTogglePayload {
  versesEnabled: boolean;
}

export interface VerseChangedPayload {
  verseIndex: number;
}

export interface KeyChangedPayload {
  keyOffset: number;
}

export interface ModeChangedPayload {
  displayMode: 'lyrics' | 'chords';
}

export interface QueueUpdatedPayload {
  queue: GroupedQueue[];
}

export interface ProjectorResolutionPayload {
  width: number;
  height: number;
  linesPerVerse: number;
}

// Queue grouping
export interface GroupedQueue {
  requesterName: string;
  sessionId: string;
  entries: QueueEntry[];
  firstRequestTime: string;
}

// Auth types
export interface AuthUser {
  id: number;
  username: string;
  isAdmin: boolean;
}

// Fastify request decorations
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    sessionId?: string;
  }
}


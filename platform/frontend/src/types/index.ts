// Song types
export interface Song {
  id: number;
  name: string;
  singer: string;
  composers?: string[];
  lyricists?: string[];
  translators?: string[];
  isPrivate?: boolean;
  categoryIds?: string[];
  direction?: 'ltr' | 'rtl';
}

// Parsed song line types
// directive = {} brackets (green, chords mode only)
// cue = [] brackets with non-chord text (red, both modes)
export type LineType = 'directive' | 'cue' | 'chords' | 'lyric' | 'empty';

export interface ParsedLine {
  type: LineType;
  text: string;
  raw?: string;
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
  // Note: verse calculation now handled by frontend via verseCalculator utility
}

// Queue types
export interface QueueEntry {
  id: number;
  song_id: number;
  requester_name: string;
  session_id: string;
  notes: string | null;  // Optional notes from viewer (max 50 chars)
  status: 'pending' | 'played';
  created_at: string;
  played_at: string | null;
  songName: string;
  songArtist: string;
}

export interface GroupedQueue {
  requesterName: string;
  sessionId: string;
  entries: QueueEntry[];
  firstRequestTime: string;
}

// Playing state types
export interface PlayingState {
  currentSongId: number | null;
  currentVerseIndex: number;
  currentKeyOffset: number;
  displayMode: 'lyrics' | 'chords';
  versesEnabled: boolean;
  projectorWidth: number | null;
  projectorHeight: number | null;
  projectorLinesPerVerse: number | null;
  song: Song | null;
  // Song status for search view coloring
  pendingSongIds: number[];
  playedSongIds: number[];
}

// Song status payload (from socket event)
export interface SongStatusPayload {
  currentSongId: number | null;
  pendingSongIds: number[];
  playedSongIds: number[];
}

// Auth types
export interface AuthUser {
  id: number;
  username: string;
  isAdmin: boolean;
  displayName?: string | null;
}

export interface AuthState {
  authenticated: boolean;
  user: AuthUser | null;
}

// Room types (multi-tenant)
export interface Room {
  username: string;
  displayName: string | null;
  adminId: number;
}

// Playing state now includes room info
export interface PlayingStateWithRoom extends PlayingState {
  roomUsername: string;
  roomDisplayName: string | null;
}


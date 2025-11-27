// Song types
export interface Song {
  id: number;
  name: string;
  singer: string;
  composers?: string[];
  lyricists?: string[];
  isPrivate?: boolean;
  categoryIds?: string[];
  direction?: 'ltr' | 'rtl';
}

// Parsed song line types
export type LineType = 'directive' | 'chords' | 'lyric' | 'empty';

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
  verseBreaks: number[];
}

// Queue types
export interface QueueEntry {
  id: number;
  song_id: number;
  requester_name: string;
  session_id: string;
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
  projectorWidth: number | null;
  projectorHeight: number | null;
  projectorLinesPerVerse: number | null;
  song: Song | null;
}

// Auth types
export interface AuthUser {
  id: number;
  username: string;
  isAdmin: boolean;
}

export interface AuthState {
  authenticated: boolean;
  user: AuthUser | null;
}


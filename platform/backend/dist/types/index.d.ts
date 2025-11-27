import '@fastify/cookie';
export interface Song {
    id: number;
    name: string;
    singer: string;
    composers?: string[];
    lyricists?: string[];
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
export interface SongChangedPayload {
    songId: number;
    verseIndex: number;
    keyOffset: number;
    displayMode: 'lyrics' | 'chords';
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
export interface GroupedQueue {
    requesterName: string;
    sessionId: string;
    entries: QueueEntry[];
    firstRequestTime: string;
}
export interface AuthUser {
    id: number;
    username: string;
    isAdmin: boolean;
}
declare module 'fastify' {
    interface FastifyRequest {
        user?: AuthUser;
        sessionId?: string;
    }
}

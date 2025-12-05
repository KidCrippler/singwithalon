import { randomUUID } from 'crypto';
import { getDb } from '../db/index.js';

export type AnalyticsAction = 
  | 'queued' 
  | 'played' 
  | 'removed_by_viewer' 
  | 'removed_by_admin';

export type AnalyticsTrigger = 
  | 'search' 
  | 'song_view' 
  | 'queue';

interface TrackSongEventParams {
  roomId: number;
  songId: number;
  action: AnalyticsAction;
  trigger: AnalyticsTrigger;
  viewerName?: string | null;
  sessionId?: string | null;
}

// In-memory event ID per room (reset on truncate)
const roomEventIds = new Map<number, string>();

export const analytics = {
  /**
   * Track a song-related event (queue, play, remove)
   * Fire-and-forget: errors are logged but don't crash the app
   */
  trackSongEvent(params: TrackSongEventParams): void {
    const { roomId, songId, action, trigger, viewerName, sessionId } = params;
    
    const eventId = roomEventIds.get(roomId) ?? this.resetEvent(roomId);
    
    // Fire and forget - don't await, don't throw
    getDb().execute({
      sql: `INSERT INTO song_analytics 
            (room_id, song_id, viewer_name, session_id, action, trigger, event_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [roomId, songId, viewerName ?? null, sessionId ?? null, action, trigger, eventId]
    }).catch((error) => {
      console.error('[Analytics] Failed to track event:', {
        action,
        trigger,
        roomId,
        songId,
        error: error instanceof Error ? error.message : String(error)
      });
    });
  },

  /**
   * Call when queue is truncated — starts a new event for the room
   */
  resetEvent(roomId: number): string {
    const newEventId = randomUUID();
    roomEventIds.set(roomId, newEventId);
    console.log(`[Analytics] New event started for room ${roomId}: ${newEventId}`);
    return newEventId;
  },

  /**
   * Get current event ID for a room (creates one if none exists)
   */
  getEventId(roomId: number): string {
    return roomEventIds.get(roomId) ?? this.resetEvent(roomId);
  }
};


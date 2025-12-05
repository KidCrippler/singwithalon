import type { Song, ParsedSong, PlayingStateWithRoom, GroupedQueue, QueueEntry, AuthState } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  
  // Copy existing headers if any
  if (options?.headers) {
    const existingHeaders = options.headers;
    if (existingHeaders instanceof Headers) {
      existingHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(existingHeaders)) {
      existingHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, existingHeaders);
    }
  }
  
  // Only set Content-Type for requests with a body
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API (room-scoped login)
export const authApi = {
  // Room-scoped login - only accepts password (username from URL)
  async login(roomUsername: string, password: string): Promise<{ 
    success: boolean; 
    user: { id: number; username: string; displayName: string | null; isAdmin: boolean } 
  }> {
    return fetchJson(`/api/rooms/${roomUsername}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },

  async logout(): Promise<{ success: boolean }> {
    return fetchJson('/api/auth/logout', { method: 'POST' });
  },

  async getMe(): Promise<AuthState> {
    return fetchJson('/api/auth/me');
  },
};

// Songs API (global, not room-scoped)
export const songsApi = {
  async list(): Promise<Song[]> {
    return fetchJson('/api/songs');
  },

  async get(id: number): Promise<Song> {
    return fetchJson(`/api/songs/${id}`);
  },

  async getLyrics(id: number): Promise<ParsedSong> {
    return fetchJson(`/api/songs/${id}/lyrics`);
  },

  async reload(): Promise<{ success: boolean; count: number }> {
    return fetchJson('/api/songs/reload', { method: 'POST' });
  },
};

// Queue API (room-scoped)
export const queueApi = {
  // Admin: get full queue for room
  async list(roomUsername: string): Promise<GroupedQueue[]> {
    return fetchJson(`/api/rooms/${roomUsername}/queue`);
  },

  // Viewer: add to room's queue
  async add(roomUsername: string, songId: number, requesterName: string, notes?: string): Promise<{ success: boolean; entry: QueueEntry }> {
    return fetchJson(`/api/rooms/${roomUsername}/queue`, {
      method: 'POST',
      body: JSON.stringify({ songId, requesterName, notes }),
    });
  },

  // Viewer: remove own entry
  async remove(roomUsername: string, id: number): Promise<{ success: boolean }> {
    return fetchJson(`/api/rooms/${roomUsername}/queue/${id}`, { method: 'DELETE' });
  },

  // Viewer: get own entries in room
  async getMine(roomUsername: string): Promise<QueueEntry[]> {
    return fetchJson(`/api/rooms/${roomUsername}/queue/mine`);
  },

  // Admin: present from queue
  async present(roomUsername: string, id: number): Promise<{ success: boolean }> {
    return fetchJson(`/api/rooms/${roomUsername}/queue/${id}/present`, { method: 'POST' });
  },

  // Admin: delete any entry
  async adminDelete(roomUsername: string, id: number): Promise<{ success: boolean }> {
    return fetchJson(`/api/rooms/${roomUsername}/queue/${id}/admin`, { method: 'DELETE' });
  },

  // Admin: delete group
  async deleteGroup(roomUsername: string, sessionId: string, requesterName: string): Promise<{ success: boolean; deletedCount: number }> {
    return fetchJson(`/api/rooms/${roomUsername}/queue/group`, {
      method: 'DELETE',
      body: JSON.stringify({ sessionId, requesterName }),
    });
  },

  // Admin: truncate room's queue
  async truncate(roomUsername: string): Promise<{ success: boolean }> {
    return fetchJson(`/api/rooms/${roomUsername}/queue`, { method: 'DELETE' });
  },
};

// State API (room-scoped)
export const stateApi = {
  async get(roomUsername: string): Promise<PlayingStateWithRoom> {
    return fetchJson(`/api/rooms/${roomUsername}/state`);
  },

  // Admin controls
  async setSong(roomUsername: string, songId: number, trigger: 'search' | 'song_view' = 'search'): Promise<{ success: boolean }> {
    return fetchJson(`/api/rooms/${roomUsername}/state/song`, {
      method: 'POST',
      body: JSON.stringify({ songId, trigger }),
    });
  },

  async clearSong(roomUsername: string): Promise<{ success: boolean }> {
    return fetchJson(`/api/rooms/${roomUsername}/state/song`, { method: 'DELETE' });
  },

  async nextVerse(roomUsername: string): Promise<{ success: boolean; verseIndex: number }> {
    return fetchJson(`/api/rooms/${roomUsername}/state/verse/next`, { method: 'POST' });
  },

  async prevVerse(roomUsername: string): Promise<{ success: boolean; verseIndex: number }> {
    return fetchJson(`/api/rooms/${roomUsername}/state/verse/prev`, { method: 'POST' });
  },

  async setVerse(roomUsername: string, verseIndex: number): Promise<{ success: boolean; verseIndex: number }> {
    return fetchJson(`/api/rooms/${roomUsername}/state/verse`, {
      method: 'POST',
      body: JSON.stringify({ verseIndex }),
    });
  },

  // syncKey: Admin sends their current local key to all viewers
  async syncKey(roomUsername: string, keyOffset: number): Promise<{ success: boolean; keyOffset: number }> {
    return fetchJson(`/api/rooms/${roomUsername}/state/key/sync`, {
      method: 'POST',
      body: JSON.stringify({ keyOffset }),
    });
  },

  async setMode(roomUsername: string, displayMode: 'lyrics' | 'chords'): Promise<{ success: boolean; displayMode: string }> {
    return fetchJson(`/api/rooms/${roomUsername}/state/mode`, {
      method: 'POST',
      body: JSON.stringify({ displayMode }),
    });
  },

  async toggleVerses(roomUsername: string): Promise<{ success: boolean; versesEnabled: boolean }> {
    return fetchJson(`/api/rooms/${roomUsername}/state/verses/toggle`, { method: 'POST' });
  },
};

// Projector API (room-scoped)
export const projectorApi = {
  async register(roomUsername: string, width: number, height: number, linesPerVerse: number): Promise<{ success: boolean; isFirstProjector: boolean }> {
    return fetchJson(`/api/rooms/${roomUsername}/projector/register`, {
      method: 'POST',
      body: JSON.stringify({ width, height, linesPerVerse }),
    });
  },
};

// Health check
export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return fetchJson('/api/health');
}

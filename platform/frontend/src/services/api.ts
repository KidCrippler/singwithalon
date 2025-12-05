import type { Song, ParsedSong, PlayingState, GroupedQueue, QueueEntry, AuthState } from '../types';

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

// Auth API
export const authApi = {
  async login(username: string, password: string): Promise<{ success: boolean; user: { username: string; isAdmin: boolean } }> {
    return fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async logout(): Promise<{ success: boolean }> {
    return fetchJson('/api/auth/logout', { method: 'POST' });
  },

  async getMe(): Promise<AuthState> {
    return fetchJson('/api/auth/me');
  },
};

// Songs API
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

// Queue API
export const queueApi = {
  // Viewer operations
  async list(): Promise<GroupedQueue[]> {
    return fetchJson('/api/queue');
  },

  async add(songId: number, requesterName: string, notes?: string): Promise<{ success: boolean; entry: QueueEntry }> {
    return fetchJson('/api/queue', {
      method: 'POST',
      body: JSON.stringify({ songId, requesterName, notes }),
    });
  },

  async remove(id: number): Promise<{ success: boolean }> {
    return fetchJson(`/api/queue/${id}`, { method: 'DELETE' });
  },

  async getMine(): Promise<QueueEntry[]> {
    return fetchJson('/api/queue/mine');
  },

  // Admin operations
  async present(id: number): Promise<{ success: boolean }> {
    return fetchJson(`/api/queue/${id}/present`, { method: 'POST' });
  },

  async adminDelete(id: number): Promise<{ success: boolean }> {
    return fetchJson(`/api/queue/${id}/admin`, { method: 'DELETE' });
  },

  async deleteGroup(sessionId: string, requesterName: string): Promise<{ success: boolean; deletedCount: number }> {
    return fetchJson('/api/queue/group', {
      method: 'DELETE',
      body: JSON.stringify({ sessionId, requesterName }),
    });
  },

  async truncate(): Promise<{ success: boolean }> {
    return fetchJson('/api/queue', { method: 'DELETE' });
  },
};

// State API
export const stateApi = {
  async get(): Promise<PlayingState> {
    return fetchJson('/api/state');
  },

  // Admin controls
  async setSong(songId: number): Promise<{ success: boolean }> {
    return fetchJson('/api/state/song', {
      method: 'POST',
      body: JSON.stringify({ songId }),
    });
  },

  async clearSong(): Promise<{ success: boolean }> {
    return fetchJson('/api/state/song', { method: 'DELETE' });
  },

  async nextVerse(): Promise<{ success: boolean; verseIndex: number }> {
    return fetchJson('/api/state/verse/next', { method: 'POST' });
  },

  async prevVerse(): Promise<{ success: boolean; verseIndex: number }> {
    return fetchJson('/api/state/verse/prev', { method: 'POST' });
  },

  async setVerse(verseIndex: number): Promise<{ success: boolean; verseIndex: number }> {
    return fetchJson('/api/state/verse', {
      method: 'POST',
      body: JSON.stringify({ verseIndex }),
    });
  },

  // syncKey: Admin sends their current local key to all viewers
  async syncKey(keyOffset: number): Promise<{ success: boolean; keyOffset: number }> {
    return fetchJson('/api/state/key/sync', {
      method: 'POST',
      body: JSON.stringify({ keyOffset }),
    });
  },

  async setMode(displayMode: 'lyrics' | 'chords'): Promise<{ success: boolean; displayMode: string }> {
    return fetchJson('/api/state/mode', {
      method: 'POST',
      body: JSON.stringify({ displayMode }),
    });
  },

  async toggleVerses(): Promise<{ success: boolean; versesEnabled: boolean }> {
    return fetchJson('/api/state/verses/toggle', { method: 'POST' });
  },
};

// Projector API
export const projectorApi = {
  async register(width: number, height: number, linesPerVerse: number): Promise<{ success: boolean; isFirstProjector: boolean }> {
    return fetchJson('/api/projector/register', {
      method: 'POST',
      body: JSON.stringify({ width, height, linesPerVerse }),
    });
  },
};

// Health check
export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return fetchJson('/api/health');
}


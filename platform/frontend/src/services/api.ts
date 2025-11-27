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
  async list(): Promise<GroupedQueue[]> {
    return fetchJson('/api/queue');
  },

  async add(songId: number, requesterName: string): Promise<{ success: boolean; entry: QueueEntry }> {
    return fetchJson('/api/queue', {
      method: 'POST',
      body: JSON.stringify({ songId, requesterName }),
    });
  },

  async remove(id: number): Promise<{ success: boolean }> {
    return fetchJson(`/api/queue/${id}`, { method: 'DELETE' });
  },

  async getMine(): Promise<QueueEntry[]> {
    return fetchJson('/api/queue/mine');
  },
};

// State API
export const stateApi = {
  async get(): Promise<PlayingState> {
    return fetchJson('/api/state');
  },
};

// Health check
export async function healthCheck(): Promise<{ status: string; timestamp: string }> {
  return fetchJson('/api/health');
}


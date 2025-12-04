import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { songsApi } from '../services/api';
import type { Song } from '../types';

interface SongsContextValue {
  songs: Song[];
  isLoading: boolean;
  error: string | null;
  reloadSongs: () => Promise<void>;
}

const SongsContext = createContext<SongsContextValue | null>(null);

export function SongsProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load songs once on app startup
  useEffect(() => {
    songsApi.list()
      .then(setSongs)
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  // Admin action to reload songs from server
  const reloadSongs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await songsApi.reload();
      const newSongs = await songsApi.list();
      setSongs(newSongs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload songs');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <SongsContext.Provider value={{ songs, isLoading, error, reloadSongs }}>
      {children}
    </SongsContext.Provider>
  );
}

export function useSongs() {
  const context = useContext(SongsContext);
  if (!context) {
    throw new Error('useSongs must be used within a SongsProvider');
  }
  return context;
}


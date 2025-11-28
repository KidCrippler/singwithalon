import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { stateApi } from '../services/api';
import type { PlayingState } from '../types';

interface PlayingNowContextValue {
  state: PlayingState;
  isLoading: boolean;
  // Viewer's local override for verse mode (null = use admin preference)
  viewerVerseOverride: boolean | null;
  setViewerVerseOverride: (override: boolean | null) => void;
  // Computed effective verse mode
  effectiveVersesEnabled: boolean;
  // Actions
  setSong: (songId: number) => void;
  clearSong: () => void;
  nextVerse: () => void;
  prevVerse: () => void;
  setVerse: (index: number) => void;
  setKeyOffset: (offset: number) => void;
  setDisplayMode: (mode: 'lyrics' | 'chords') => void;
  toggleVersesEnabled: () => void;
}

const defaultState: PlayingState = {
  currentSongId: null,
  currentVerseIndex: 0,
  currentKeyOffset: 0,
  displayMode: 'lyrics',
  versesEnabled: false,
  projectorWidth: null,
  projectorHeight: null,
  projectorLinesPerVerse: null,
  song: null,
};

const PlayingNowContext = createContext<PlayingNowContextValue | null>(null);

export function PlayingNowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlayingState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);
  // Viewer's local override for verse mode (null = use admin preference, false = force full view)
  const [viewerVerseOverride, setViewerVerseOverride] = useState<boolean | null>(null);
  const { socket } = useSocket();

  // Computed effective verse mode: viewer override takes precedence if set
  const effectiveVersesEnabled = viewerVerseOverride ?? state.versesEnabled;

  // Fetch initial state
  useEffect(() => {
    stateApi.get()
      .then(setState)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('song:changed', (payload: { songId: number; verseIndex: number; keyOffset: number; displayMode: 'lyrics' | 'chords'; versesEnabled: boolean }) => {
      setState(prev => ({
        ...prev,
        currentSongId: payload.songId,
        currentVerseIndex: payload.verseIndex,
        currentKeyOffset: payload.keyOffset,
        displayMode: payload.displayMode,
        versesEnabled: payload.versesEnabled,
      }));
      // Reset viewer override when song changes
      setViewerVerseOverride(null);
    });

    socket.on('song:cleared', () => {
      setState(prev => ({
        ...prev,
        currentSongId: null,
        currentVerseIndex: 0,
        currentKeyOffset: 0,
        song: null,
      }));
    });

    socket.on('verse:changed', (payload: { verseIndex: number }) => {
      setState(prev => ({
        ...prev,
        currentVerseIndex: payload.verseIndex,
      }));
    });

    socket.on('key:changed', (payload: { keyOffset: number }) => {
      setState(prev => ({
        ...prev,
        currentKeyOffset: payload.keyOffset,
      }));
    });

    socket.on('mode:changed', (payload: { displayMode: 'lyrics' | 'chords' }) => {
      setState(prev => ({
        ...prev,
        displayMode: payload.displayMode,
      }));
    });

    socket.on('projector:resolution', (payload: { width: number; height: number; linesPerVerse: number }) => {
      setState(prev => ({
        ...prev,
        projectorWidth: payload.width,
        projectorHeight: payload.height,
        projectorLinesPerVerse: payload.linesPerVerse,
      }));
    });

    socket.on('verses:toggled', (payload: { versesEnabled: boolean }) => {
      setState(prev => ({
        ...prev,
        versesEnabled: payload.versesEnabled,
      }));
    });

    return () => {
      socket.off('song:changed');
      socket.off('song:cleared');
      socket.off('verse:changed');
      socket.off('key:changed');
      socket.off('mode:changed');
      socket.off('projector:resolution');
      socket.off('verses:toggled');
    };
  }, [socket]);

  const setSong = useCallback((songId: number) => {
    socket?.emit('song:set', { songId });
  }, [socket]);

  const clearSong = useCallback(() => {
    socket?.emit('song:clear');
  }, [socket]);

  const nextVerse = useCallback(() => {
    socket?.emit('verse:next');
  }, [socket]);

  const prevVerse = useCallback(() => {
    socket?.emit('verse:prev');
  }, [socket]);

  const setVerse = useCallback((verseIndex: number) => {
    socket?.emit('verse:set', { verseIndex });
  }, [socket]);

  const setKeyOffset = useCallback((keyOffset: number) => {
    socket?.emit('key:set', { keyOffset });
  }, [socket]);

  const setDisplayMode = useCallback((displayMode: 'lyrics' | 'chords') => {
    socket?.emit('mode:set', { displayMode });
  }, [socket]);

  const toggleVersesEnabled = useCallback(() => {
    socket?.emit('verses:toggle');
  }, [socket]);

  return (
    <PlayingNowContext.Provider value={{
      state,
      isLoading,
      viewerVerseOverride,
      setViewerVerseOverride,
      effectiveVersesEnabled,
      setSong,
      clearSong,
      nextVerse,
      prevVerse,
      setVerse,
      setKeyOffset,
      setDisplayMode,
      toggleVersesEnabled,
    }}>
      {children}
    </PlayingNowContext.Provider>
  );
}

export function usePlayingNow() {
  const context = useContext(PlayingNowContext);
  if (!context) {
    throw new Error('usePlayingNow must be used within a PlayingNowProvider');
  }
  return context;
}


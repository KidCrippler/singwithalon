import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useRoom } from './RoomContext';
import { stateApi, songsApi } from '../services/api';
import type { PlayingState, SongStatusPayload } from '../types';

interface PlayingNowContextValue {
  state: PlayingState;
  isLoading: boolean;
  
  // Viewer mode lock system
  viewerModeLocked: boolean;
  viewerDisplayMode: 'lyrics' | 'chords';  // Viewer's setting (used when locked)
  viewerVersesEnabled: boolean;            // Viewer's setting (used when locked)
  toggleViewerLock: () => void;            // Toggle lock (initializes from admin on lock-on)
  setViewerDisplayMode: (mode: 'lyrics' | 'chords') => void;
  setViewerVersesEnabled: (enabled: boolean) => void;
  
  // Computed effective values (locked ? viewer : admin)
  effectiveDisplayMode: 'lyrics' | 'chords';
  effectiveVersesEnabled: boolean;
  
  // Viewer's local override for key offset (null = use admin preference)
  viewerKeyOverride: number | null;
  setViewerKeyOverride: (override: number | null) => void;
  // Computed effective key offset
  effectiveKeyOffset: number;
  // Is viewer out of sync with admin's key?
  isKeyOutOfSync: boolean;
  
  // Verse bounds tracking (set by PlayingNowView when it calculates verses)
  maxVerseIndex: number;
  setMaxVerseIndex: (max: number) => void;
  
  // Actions
  setSong: (songId: number) => void;
  clearSong: () => void;
  nextVerse: () => void;
  prevVerse: () => void;
  setVerse: (index: number) => void;
  setKeyOffset: (offset: number) => void;
  syncKeyToAll: () => void;
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
  pendingSongIds: [],
  playedSongIds: [],
};

const PlayingNowContext = createContext<PlayingNowContextValue | null>(null);

export function PlayingNowProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlayingState>(defaultState);
  const [isLoading, setIsLoading] = useState(true);
  
  // Viewer mode lock system
  const [viewerModeLocked, setViewerModeLocked] = useState(false);
  const [viewerDisplayMode, setViewerDisplayMode] = useState<'lyrics' | 'chords'>('lyrics');
  const [viewerVersesEnabled, setViewerVersesEnabled] = useState(false);
  
  // Viewer's local override for key offset (null = use admin preference)
  const [viewerKeyOverride, setViewerKeyOverride] = useState<number | null>(null);
  
  // Verse bounds tracking (set by PlayingNowView when it calculates verses)
  const [maxVerseIndex, setMaxVerseIndex] = useState(0);
  
  const { socket, isConnected, joinRoom } = useSocket();
  const { roomUsername, getSessionId } = useRoom();

  // Computed effective values: when locked, use viewer's settings; otherwise use admin's
  const effectiveDisplayMode = viewerModeLocked ? viewerDisplayMode : state.displayMode;
  const effectiveVersesEnabled = viewerModeLocked ? viewerVersesEnabled : state.versesEnabled;
  
  // Computed effective key offset: viewer override takes precedence if set
  const effectiveKeyOffset = viewerKeyOverride ?? state.currentKeyOffset;
  
  // Is viewer out of sync with admin's key?
  const isKeyOutOfSync = effectiveKeyOffset !== state.currentKeyOffset;

  // Toggle lock - when turning ON, initialize viewer settings from admin's current state
  const toggleViewerLock = useCallback(() => {
    setViewerModeLocked(prev => {
      if (!prev) {
        // Turning lock ON - initialize viewer settings from admin's current state
        setViewerDisplayMode(state.displayMode);
        setViewerVersesEnabled(state.versesEnabled);
      }
      // Turning lock OFF - no action needed, we just use admin's state
      return !prev;
    });
  }, [state.displayMode, state.versesEnabled]);

  // Join socket room when room changes
  useEffect(() => {
    if (!socket || !isConnected || !roomUsername) return;
    
    const sid = getSessionId();
    joinRoom(roomUsername, sid);
  }, [socket, isConnected, roomUsername, joinRoom, getSessionId]);

  // Fetch initial state when room is available
  useEffect(() => {
    if (!roomUsername) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    stateApi.get(roomUsername)
      .then(setState)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [roomUsername]);

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
      // Initialize viewer's key to admin's key (but as their own independent offset)
      setViewerKeyOverride(payload.keyOffset);
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

    // Admin pushed key to all viewers - sync viewer's key to admin's
    socket.on('key:sync', (payload: { keyOffset: number }) => {
      setState(prev => ({
        ...prev,
        currentKeyOffset: payload.keyOffset,
      }));
      setViewerKeyOverride(payload.keyOffset);
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

    socket.on('songs:status-changed', (payload: SongStatusPayload) => {
      setState(prev => ({
        ...prev,
        pendingSongIds: payload.pendingSongIds,
        playedSongIds: payload.playedSongIds,
      }));
    });

    return () => {
      socket.off('song:changed');
      socket.off('song:cleared');
      socket.off('verse:changed');
      socket.off('key:sync');
      socket.off('mode:changed');
      socket.off('projector:resolution');
      socket.off('verses:toggled');
      socket.off('songs:status-changed');
    };
  }, [socket]);

  // Fetch song metadata when currentSongId changes
  useEffect(() => {
    if (state.currentSongId) {
      songsApi.get(state.currentSongId)
        .then(song => {
          setState(prev => ({ ...prev, song }));
        })
        .catch(console.error);
    }
  }, [state.currentSongId]);

  // Admin actions - all via REST API (server broadcasts via socket)
  // All actions now require roomUsername
  const setSong = useCallback((songId: number) => {
    if (!roomUsername) return;
    stateApi.setSong(roomUsername, songId).catch(console.error);
  }, [roomUsername]);

  const clearSong = useCallback(() => {
    if (!roomUsername) return;
    stateApi.clearSong(roomUsername).catch(console.error);
  }, [roomUsername]);

  const nextVerse = useCallback(() => {
    if (!roomUsername) return;
    // Don't call API if we're already at or beyond the max verse
    if (state.currentVerseIndex >= maxVerseIndex) {
      return;
    }
    // Optimistic update - update UI immediately for responsiveness
    setState(prev => ({
      ...prev,
      currentVerseIndex: prev.currentVerseIndex + 1,
    }));
    // Then sync with server (which broadcasts to other clients)
    stateApi.nextVerse(roomUsername).catch(console.error);
  }, [roomUsername, state.currentVerseIndex, maxVerseIndex]);

  const prevVerse = useCallback(() => {
    if (!roomUsername) return;
    if (state.currentVerseIndex <= 0) {
      return;
    }
    // Optimistic update - update UI immediately for responsiveness
    setState(prev => ({
      ...prev,
      currentVerseIndex: Math.max(0, prev.currentVerseIndex - 1),
    }));
    // Then sync with server (which broadcasts to other clients)
    stateApi.prevVerse(roomUsername).catch(console.error);
  }, [roomUsername, state.currentVerseIndex]);

  const setVerse = useCallback((verseIndex: number) => {
    if (!roomUsername) return;
    stateApi.setVerse(roomUsername, verseIndex).catch(console.error);
  }, [roomUsername]);

  // Admin key change - local only, no server call
  const setKeyOffset = useCallback((keyOffset: number) => {
    setState(prev => ({
      ...prev,
      currentKeyOffset: keyOffset,
    }));
  }, []);

  // Sync admin's current key to all viewers
  const syncKeyToAll = useCallback(() => {
    if (!roomUsername) return;
    stateApi.syncKey(roomUsername, state.currentKeyOffset).catch(console.error);
  }, [roomUsername, state.currentKeyOffset]);

  const setDisplayMode = useCallback((displayMode: 'lyrics' | 'chords') => {
    if (!roomUsername) return;
    // Optimistic update
    setState(prev => ({ ...prev, displayMode }));
    stateApi.setMode(roomUsername, displayMode).catch(console.error);
  }, [roomUsername]);

  const toggleVersesEnabled = useCallback(() => {
    if (!roomUsername) return;
    // Optimistic update
    setState(prev => ({ ...prev, versesEnabled: !prev.versesEnabled }));
    stateApi.toggleVerses(roomUsername).catch(console.error);
  }, [roomUsername]);

  return (
    <PlayingNowContext.Provider value={{
      state,
      isLoading,
      viewerModeLocked,
      viewerDisplayMode,
      viewerVersesEnabled,
      toggleViewerLock,
      setViewerDisplayMode,
      setViewerVersesEnabled,
      effectiveDisplayMode,
      effectiveVersesEnabled,
      viewerKeyOverride,
      setViewerKeyOverride,
      effectiveKeyOffset,
      isKeyOutOfSync,
      maxVerseIndex,
      setMaxVerseIndex,
      setSong,
      clearSong,
      nextVerse,
      prevVerse,
      setVerse,
      setKeyOffset,
      syncKeyToAll,
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

import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// Per-CLIENT chord-renderer choice (this browser/tablet only), persisted in
// localStorage - NOT a per-room setting, so it needs no backend. 'classic' is
// the old inline LineDisplay renderer; 'new' is the aligned <ChordSheet />.
// Default 'classic' so nothing changes until a user opts in from the header menu.
//
// A module-level store + useSyncExternalStore keeps every mounted screen in the
// same tab in sync the instant the value changes (a plain useState per component
// would leave the other screens stale until re-mount).
// ---------------------------------------------------------------------------

export type ChordRenderer = 'classic' | 'new';

const STORAGE_KEY = 'chordRenderer';

function read(): ChordRenderer {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'new' ? 'new' : 'classic';
  } catch {
    return 'classic';
  }
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  // Also react to changes from OTHER tabs (localStorage `storage` event).
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
}

export function setChordRenderer(value: ChordRenderer): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore (private mode / storage disabled) - value simply won't persist.
  }
  // Notify same-tab subscribers (the `storage` event only fires in other tabs).
  listeners.forEach((cb) => cb());
}

export function useChordRenderer(): ChordRenderer {
  return useSyncExternalStore(subscribe, read, () => 'classic');
}

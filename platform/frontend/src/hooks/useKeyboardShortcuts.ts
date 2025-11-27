import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePlayingNow } from '../context/PlayingNowContext';

export function useKeyboardShortcuts() {
  const { isAdmin } = useAuth();
  const { nextVerse, prevVerse } = usePlayingNow();

  useEffect(() => {
    if (!isAdmin) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          nextVerse();
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          prevVerse();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin, nextVerse, prevVerse]);
}


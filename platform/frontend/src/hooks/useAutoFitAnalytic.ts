import { useEffect, useMemo, useState } from 'react';
import type { ParsedSong } from '../types';
import {
  computeAutoFit,
  type AutoFitResult,
  type FontMode,
} from '../utils/autoFitAnalytic';

// ---------------------------------------------------------------------------
// Auto-fit hook for <ChordSheet /> - the React wrapper around the analytic
// engine (../utils/autoFitAnalytic, computeAutoFit). For the slow-but-accurate
// ground-truth variant see ../hooks/useAutoFitOffscreen.
//
// Given a song and the available viewport, returns the (columns, fontSize) that
// maximizes font size while the whole song fits with no scroll. All the work is
// synchronous canvas measurement + arithmetic (see autoFitAnalytic), so this
// is a useMemo with one extra wrinkle: web fonts (Heebo/Cousine) load after first
// paint and change glyph widths, so we recompute once document.fonts is ready -
// the same concern ChordSheet handles for its chord placement.
// ---------------------------------------------------------------------------

export interface UseAutoFitOptions {
  song: ParsedSong | null;
  keyOffset: number;
  font: FontMode;
  viewport: { width: number; height: number };
  gap?: number;
  padX?: number;
  padY?: number;
  /** When false, skip computation entirely (e.g. the user has a manual override). */
  enabled?: boolean;
}

export function useAutoFitAnalytic({
  song,
  keyOffset,
  font,
  viewport,
  gap,
  padX,
  padY,
  enabled = true,
}: UseAutoFitOptions): AutoFitResult | null {
  // Bumped once fonts finish loading to force a recompute with real metrics.
  const [fontsTick, setFontsTick] = useState(0);

  useEffect(() => {
    if (!document.fonts?.ready) return;
    let alive = true;
    document.fonts.ready
      .then(() => {
        if (alive) setFontsTick((t) => t + 1);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return useMemo<AutoFitResult | null>(() => {
    if (!enabled || !song || viewport.width <= 0 || viewport.height <= 0) {
      return null;
    }
    return computeAutoFit({ song, keyOffset, font, viewport, gap, padX, padY });
    // fontsTick intentionally in deps to recompute after web fonts load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    song,
    keyOffset,
    font,
    viewport.width,
    viewport.height,
    gap,
    padX,
    padY,
    fontsTick,
  ]);
}

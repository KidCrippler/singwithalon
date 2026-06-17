import { createElement, useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ParsedSong } from '../types';
import { ChordSheet } from '../components/views/ChordSheet';
import type { AutoFitResult, FontMode } from '../utils/autoFitAnalytic';

// ---------------------------------------------------------------------------
// Auto-fit calculator #2 (offscreen, GROUND TRUTH) for <ChordSheet /> - the
// slow-but-accurate twin of the analytic calculator (../utils/autoFitAnalytic,
// computeAutoFit). Both run the same columns-1..8 / binary-search-font loop;
// this one is the reference the analytic version is tuned against. Subsystem
// overview: ../components/views/CHORDSHEET.md.
//
// Instead of predicting widths/heights, it RENDERS the real component into a
// hidden offscreen container at each (columns, fontSize) candidate, lets the
// component's own chord measurement settle (its chords are absolutely positioned
// in px and re-measured via ResizeObserver, so a static clone can't be rescaled -
// we must mount a real instance), then reads scrollHeight/scrollWidth to decide
// fit. Same columns-1->8 / binary-search-font loop as the math version.
//
// This is async (each probe waits a couple of frames + font load) and does a few
// dozen hidden renders per song - acceptable for the playground / verification.
// ---------------------------------------------------------------------------

const MIN_FONT = 6;
const MAX_FONT = 80;
const MIN_COLS = 1;
const MAX_COLS = 8;
const TOL = 2; // px slack on scroll comparisons (matches useDynamicFontSize)

export interface UseOffscreenAutoFitOptions {
  song: ParsedSong | null;
  keyOffset: number;
  font: FontMode;
  viewport: { width: number; height: number };
  gap?: number;
  enabled?: boolean;
}

export interface OffscreenAutoFitState {
  result: AutoFitResult | null;
  measuring: boolean;
}

/** Resolve on the next animation frame. */
function raf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Wait until an element's rendered height stops changing across frames, then
 * resolve. The sheet positions its chords in an async useLayoutEffect that fires
 * setState (a second render+layout pass), so a fixed frame count races against
 * that settling - we poll until height is stable for two consecutive frames (or
 * a frame budget is exhausted, as a backstop).
 */
async function settle(el: HTMLElement, maxFrames = 12): Promise<void> {
  let prev = -1;
  let stable = 0;
  for (let i = 0; i < maxFrames; i++) {
    await raf();
    const h = el.scrollHeight;
    if (h === prev) {
      if (++stable >= 2) return;
    } else {
      stable = 0;
      prev = h;
    }
  }
}

export function useAutoFitOffscreen({
  song,
  keyOffset,
  font,
  viewport,
  gap = 40,
  enabled = true,
}: UseOffscreenAutoFitOptions): OffscreenAutoFitState {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<Root | null>(null);
  const [state, setState] = useState<OffscreenAutoFitState>({
    result: null,
    measuring: false,
  });

  // Tear down the offscreen root/host on unmount.
  useEffect(() => {
    return () => {
      rootRef.current?.unmount();
      rootRef.current = null;
      hostRef.current?.remove();
      hostRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !song || viewport.width <= 0 || viewport.height <= 0) {
      // Clear any prior result/measuring flag (no-op if already cleared).
      setState((s) =>
        s.result === null && !s.measuring ? s : { result: null, measuring: false }
      );
      return;
    }

    // `alive` cancels an in-flight search when inputs change or we unmount.
    let alive = true;
    setState((s) => ({ ...s, measuring: true }));

    // Lazily create the hidden host + React root, sized to the viewport so
    // scrollHeight/scrollWidth report overflow against the real "one screen".
    const ensureHost = (): { host: HTMLDivElement; root: Root } => {
      let host = hostRef.current;
      if (!host) {
        host = document.createElement('div');
        document.body.appendChild(host);
        hostRef.current = host;
        rootRef.current = createRoot(host);
      }
      // overflow:visible + height:auto so the host grows to the real content
      // height. With overflow:hidden (or a fixed height) the host's scrollHeight
      // clamps and CSS multi-column overflow can't be detected. We measure the
      // SHEET's own height against the target viewport height instead.
      host.style.cssText = `position:absolute; left:-99999px; top:0; visibility:hidden; pointer-events:none; overflow:visible; width:${viewport.width}px;`;
      return { host, root: rootRef.current! };
    };

    // Render the sheet at (cols, fontSize) and report whether it fits with no
    // scroll. fitsVertically: no vertical overflow. fitsAllColumns: no extra CSS
    // columns pushed off the right (scrollWidth). fitsHorizontally: no single
    // line/chord row wider than one column (catches wrapping / overhang).
    const probe = async (cols: number, fontSize: number): Promise<boolean> => {
      const { host, root } = ensureHost();
      root.render(
        createElement(ChordSheet, {
          song,
          keyOffset,
          font,
          fontSize,
          columns: cols,
          columnGap: gap,
        })
      );
      // Wait for this render (and the sheet's async chord-placement pass) to
      // fully settle before measuring, so we never read stale geometry from the
      // previous probe - the source of non-deterministic results.
      await raf();
      if (!alive) return false;
      const sheet = host.firstElementChild as HTMLElement | null;
      if (!sheet) return false;
      await settle(sheet);
      if (!alive) return false;

      // Measure the SHEET directly (the host's scrollHeight is unreliable: with a
      // fixed CSS column count, vertical overflow grows the element height rather
      // than spawning extra columns, and overflow clamping hides it). The sheet's
      // own height/width are the true rendered extents.
      const sheetH = sheet.scrollHeight;
      const sheetW = sheet.scrollWidth;
      const fitsVertically = sheetH <= viewport.height + TOL;
      const fitsAllColumns = sheetW <= viewport.width + TOL;

      let fitsHorizontally = true;

      {
        const lineHeightPx = 1.2 * fontSize;

        // (a) No lyric/text line may wrap to a second visual row. A line box is
        // block-level so its WIDTH always equals the column - the only visible
        // signal of a wrap is its HEIGHT growing past one text row. We check the
        // LEAF text rows only (a row whose children are just chars/none), so the
        // multi-layer ChordLyricLine wrapper - tall by design (chord + lyric) -
        // isn't mistaken for a wrap. A single row is ~1.2-1.35em, so >1.6
        // line-heights means it wrapped onto a second line.
        const divs = sheet.querySelectorAll<HTMLElement>('div');
        for (const el of divs) {
          // A text row has no nested <div> (lyric layer's children are <span>
          // chars; plain/directive/cue/standalone-chord rows are leaf text).
          // Skip containers like the ChordLyricLine wrapper.
          if (el.querySelector('div')) continue;
          const t = (el.textContent ?? '').trim();
          if (!t) continue;
          // Wrapped rows (pre-wrap lyrics) grow in HEIGHT; a single row is
          // ~1.2-1.35em, so >1.6 line-heights means it wrapped.
          if (el.getBoundingClientRect().height > lineHeightPx * 1.6) {
            fitsHorizontally = false;
            break;
          }
          // Nowrap rows (standalone chord rows) can't wrap - they OVERFLOW, so
          // their content is wider than the column box. Skip the ChordLyricLine
          // chord layer (it holds absolutely-positioned chords whose overhang is
          // judged precisely in (b); their offset would falsely inflate
          // scrollWidth here).
          if (el.querySelector('span[style*="absolute"]')) continue;
          if (el.scrollWidth > el.clientWidth + TOL) {
            fitsHorizontally = false;
            break;
          }
        }

        // (b) No chord may COLLIDE with the neighbouring column. Chord spans are
        // absolutely positioned and can stick out past their line wrapper (which
        // the browser sizes to EXACTLY one column, placed correctly for the
        // layout direction) without affecting any box width or scrollWidth. A
        // chord legitimately sits a few px past the lyric's reading edge, and the
        // column GAP is empty space - so a chord only actually collides with the
        // next column when it crosses MORE than the gap past the wrapper edge.
        // Using the gap as the tolerance avoids flagging harmless edge-kisses
        // (which would otherwise crush the font to fit a non-problem).
        if (fitsHorizontally) {
          const chordEls = sheet.querySelectorAll<HTMLElement>(
            'span[style*="position: absolute"], span[style*="position:absolute"]'
          );
          for (const el of chordEls) {
            const wrapper = el.closest('div')?.parentElement; // chord-layer -> ChordLyricLine wrapper
            if (!wrapper) continue;
            const wr = wrapper.getBoundingClientRect();
            const r = el.getBoundingClientRect();
            if (r.right > wr.right + gap || r.left < wr.left - gap) {
              fitsHorizontally = false;
              break;
            }
          }
        }
      }

      return fitsVertically && fitsAllColumns && fitsHorizontally;
    };

    const run = async () => {
      // Ensure web fonts are loaded ONCE before any probe, so every measurement
      // uses real glyph metrics. If fonts finish loading mid-search, earlier
      // probes measure narrower fallback glyphs and wrongly accept a too-large
      // font - a key source of run-to-run variance.
      if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
      if (!alive) return;

      let bestFont = MIN_FONT;
      let bestCols = MIN_COLS;

      for (let cols = MIN_COLS; cols <= MAX_COLS && alive; cols++) {
        let lo = MIN_FONT;
        let hi = MAX_FONT;
        let bestForCols = 0;
        while (lo <= hi && alive) {
          const mid = Math.floor((lo + hi) / 2);
          const fits = await probe(cols, mid);
          if (!alive) return;
          if (fits) {
            bestForCols = mid;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
        // Iterate columns low->high with strict ">": on a tie (same best font)
        // the fewest columns win; more columns only chosen when strictly better.
        if (bestForCols > bestFont) {
          bestFont = bestForCols;
          bestCols = cols;
        }
      }

      if (alive) {
        setState({ result: { columns: bestCols, fontSize: bestFont }, measuring: false });
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [enabled, song, keyOffset, font, viewport.width, viewport.height, gap]);

  return state;
}

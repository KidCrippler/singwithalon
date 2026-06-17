// ---------------------------------------------------------------------------
// Chord placement geometry - shared by the live renderer (ChordSheet)
// and the auto-fit calculator (autoFitAnalytic).
//
// A chord authored at monospace source column `c` must be positioned above the
// right spot in the proportionally/monospace-rendered lyric below it. The logic
// has two halves:
//
//   1. DERIVE a PlacementContext from per-glyph measurements (left/right/isSpace
//      of each lyric character, in visual left-to-right order). This is pure: it
//      doesn't care whether the glyphs were measured from the live DOM
//      (getBoundingClientRect) or analytically (canvas measureText).
//   2. Hand that context to a STRATEGY chosen by (font mode, direction), which
//      returns each chord's x-position.
//
// Keeping both halves here means the renderer and the calculator place chords
// with the SAME code - so the calculator's overhang prediction tracks what the
// renderer actually draws, instead of a parallel re-derivation that drifts.
//
// THREE callers share this module - the live renderer (ChordSheet), the analytic
// auto-fit calculator (../../utils/autoFitAnalytic), and the offscreen one
// (../../hooks/useAutoFitOffscreen via the rendered component). It is the single
// place to change placement math. See ../../../CHORDSHEET.md for the map.
// ---------------------------------------------------------------------------

export type FontMode = 'proportional' | 'mono';

export interface ChordToken {
  col: number; // character column in the monospace source line
  text: string;
}

/** Split a (transposed, formatted) chord line into positioned chord tokens. */
export function tokenizeChordLine(line: string): ChordToken[] {
  const tokens: ChordToken[] = [];
  const regex = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    tokens.push({ col: m.index, text: m[0] });
  }
  return tokens;
}

/**
 * Placement of one chord, in px from the wrapper's left.
 *
 * `left` is the chord's left edge for LEFT-anchored placements (LTR strategies).
 * For RIGHT-anchored placements (RTL strategies, set `anchorRight: true`) the
 * chord is positioned by its RIGHT edge instead: `left` is then the x its right
 * edge must reach, and the renderer shifts the span left by its own measured
 * width. Right-anchoring lets the chord's LAST character (e.g. the "m" in "F#m")
 * land on the target lyric column, with the rest of the label extending leftward.
 */
export interface ChordPlacement {
  text: string;
  left: number;
  anchorRight?: boolean;
}

/** One measured lyric glyph, in visual (left-to-right) order. */
export interface MeasuredGlyph {
  left: number; // left edge px, relative to the line's left
  right: number; // right edge px, relative to the line's left
  isSpace: boolean;
}

/**
 * Everything a placement strategy needs, all derived from the measured glyphs.
 * Strategies are pure: same context in -> same placements out.
 */
export interface PlacementContext {
  tokens: ChordToken[]; // positioned chord tokens {col,text}
  chordLen: number; // transformed (transposed+formatted) chord-line length
  n: number; // measured glyph/column count (VISUAL left-to-right order)
  lefts: number[]; // per visual column left x; leading indent spread across [base, firstGlyph]
  lyricLeftX: number; // left edge of the first visual glyph (mono LTR reading edge)
  colW: number; // median non-space glyph gap (indent / extrapolation unit)
}

/** A placement strategy: pure geometry -> chord positions. */
type ChordPlacer = (ctx: PlacementContext) => ChordPlacement[];

/**
 * Right-edge x (px from the wrapper's left) of the lyric cell at LOGICAL index
 * `j`. `lefts` is in VISUAL left-to-right order, so logical index `j` lives at
 * visual column `v = n-1-j`. A cell's right edge is the NEXT visual column's left
 * edge (`lefts[v+1]`) when one exists - exact even for proportional glyphs of
 * varying width; at the visual right end (v = n-1) and past either end we
 * extrapolate by `colW`. Used by the RTL strategies to find where a chord's
 * RIGHT edge should land.
 */
function cellRightX(j: number, n: number, lefts: number[], colW: number): number {
  if (j < 0) return lefts[n - 1] + colW - j * colW; // past the right (last) edge
  if (j >= n) return lefts[0] + colW - (j - (n - 1)) * colW; // past the left edge
  const v = n - 1 - j; // visual column of logical index j
  return v + 1 < n ? lefts[v + 1] : lefts[v] + colW; // next col's left = this right
}

/**
 * Shared RTL placement (proportional and mono are identical once the lyric
 * glyphs are measured - the only difference is the metrics baked into `lefts`).
 *
 * The chord line was authored over the lyric as a monospace string sharing
 * column 0, and rendering RTL mirrors the block. We anchor each chord by its
 * RIGHTMOST character: that char sits at source column `col + text.length - 1`,
 * which maps to lyric LOGICAL index `j = (chordLen - 1) - lastCol`. We return
 * the right edge of that lyric cell and flag `anchorRight`, so the renderer
 * right-aligns the whole label there and the rest of the chord (e.g. "F#" in
 * "F#m") extends leftward. This keeps the LAST letter on the target column
 * regardless of how wide the chord label renders.
 */
const placeRtl: ChordPlacer = ({ tokens, chordLen, n, lefts, colW }) =>
  tokens.map(({ text, col }) => {
    const lastCol = col + text.length - 1;
    const j = chordLen - 1 - lastCol; // target lyric index for the LAST char
    return { text, left: cellRightX(j, n, lefts, colW), anchorRight: true };
  });

/**
 * Proportional + LTR (English). Source column maps straight to visual column
 * from the left, snapping onto the measured lyric glyph so chords track the
 * proportional lyric; extrapolate by `colW` past either end (e.g. trailing
 * chords over empty space, or a deep leading indent the driver pre-widened).
 */
const propEng: ChordPlacer = ({ tokens, n, lefts, colW }) =>
  tokens.map(({ text, col }) => {
    let left: number;
    if (col < 0) left = lefts[0] + col * colW;
    else if (col >= n) left = lefts[n - 1] + (col - (n - 1)) * colW;
    else left = lefts[col];
    return { text, left };
  });

/** Proportional + RTL (Hebrew). See `placeRtl` - proportional metrics are
 *  already baked into the measured `lefts`, so RTL placement is font-agnostic. */
const propHeb: ChordPlacer = placeRtl;

/**
 * Mono + LTR (English). The lyric is a uniform monospace grid, so chord column
 * `c` sits `c` cells from the left reading edge - no per-glyph snapping needed.
 */
const monoEng: ChordPlacer = ({ tokens, lyricLeftX, colW }) =>
  tokens.map(({ text, col }) => ({ text, left: lyricLeftX + col * colW }));

/** Mono + RTL (Hebrew). See `placeRtl` - identical to proportional RTL once the
 *  (here uniform) lyric glyphs are measured into `lefts`. */
const monoHeb: ChordPlacer = placeRtl;

/** Strategy lookup by (font mode, direction). */
const STRATEGIES: Record<FontMode, Record<'heb' | 'eng', ChordPlacer>> = {
  proportional: { heb: propHeb, eng: propEng },
  mono: { heb: monoHeb, eng: monoEng },
};

/**
 * Build a PlacementContext from measured lyric glyphs (visual left-to-right
 * order). Pure: the renderer feeds DOM-measured glyphs, the calculator feeds
 * canvas-measured ones; the derivation - leading-indent spread, colW - is
 * identical. `chordLen` is the source chord-line length, used by the RTL
 * strategy to map a chord's last char to its lyric column.
 *
 * Returns null when there are no glyphs (nothing to place against).
 */
export function deriveContext(
  measured: MeasuredGlyph[],
  tokens: ChordToken[],
  chordLen: number
): PlacementContext | null {
  const n = measured.length;
  if (n === 0) return null;

  // Left reading edge of the lyric - the origin the mono LTR strategy steps from.
  const lyricLeftX = measured[0].left;

  // Representative width of one GLYPH column - the median gap between
  // consecutive non-space glyphs. Used to extrapolate chord positions past
  // either end of the lyric (a chord column before the first / after the last
  // measured glyph) in propEng and cellRightX.
  const glyphGaps: number[] = [];
  for (let i = 1; i < n; i++) {
    if (!measured[i].isSpace && !measured[i - 1].isSpace) {
      glyphGaps.push(measured[i].left - measured[i - 1].left);
    }
  }
  glyphGaps.sort((a, b) => a - b);
  const colW =
    glyphGaps.length > 0
      ? glyphGaps[Math.floor(glyphGaps.length / 2)]
      : n > 1
        ? (measured[n - 1].left - measured[0].left) / (n - 1)
        : 0;

  // Column -> x grid. Glyphs (and INTERIOR spaces) keep their NATURAL measured
  // positions, so a chord over a real lyric character lands exactly on it (the
  // chord layer is absolutely positioned over the un-modified lyric, so any shift
  // here would drift the chord off its glyph). The one special case is a LEADING
  // run of spaces (a lyric indented to push the first word right): there's no
  // glyph to anchor to, so we DISTRIBUTE those indent columns evenly across the
  // measured indent width [base, firstGlyphLeft]. This spreads chords authored
  // over the indent (e.g. an intro "F  C  Am" before the first word) instead of
  // bunching them at the left, while keeping the first glyph - and every chord
  // over a real character - at its true measured x.
  //
  // NOTE: in proportional mode the renderer ALSO widens each leading space toward
  // a full character cell (LEADING_SPACE_EM in ChordSheet.tsx), so by the time we
  // measure here the indent is already roomy; this distribution then spreads the
  // chords across it. Mono cells are already full width, so nothing to widen.
  let leadingSpaces = 0;
  while (leadingSpaces < n && measured[leadingSpaces].isSpace) leadingSpaces++;
  const base = measured[0].left;
  const firstGlyphLeft =
    leadingSpaces < n ? measured[leadingSpaces].left : base;
  const indentColW =
    leadingSpaces > 0 ? (firstGlyphLeft - base) / leadingSpaces : 0;
  const lefts: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    lefts[i] =
      i < leadingSpaces
        ? base + i * indentColW // indent column on the evenly-spread grid
        : measured[i].left; // glyphs/interior spaces: true measured x
  }

  return {
    tokens,
    chordLen,
    n,
    lefts,
    lyricLeftX,
    colW,
  };
}

/** Pick the strategy for (font, direction) and place the chords. */
export function placeChords(
  ctx: PlacementContext,
  font: FontMode,
  isRtl: boolean
): ChordPlacement[] {
  return STRATEGIES[font][isRtl ? 'heb' : 'eng'](ctx);
}

import { transposeChordLine } from '../services/transpose';
import { formatChordLineForDisplay } from '../services/chordDisplay';
import type { LineType, ParsedLine, ParsedSong } from '../types';
import {
  deriveContext,
  placeChords,
  tokenizeChordLine,
  type MeasuredGlyph,
} from '../components/views/chordPlacement';

// ---------------------------------------------------------------------------
// Auto-fit calculator #1 (fast, no DOM) for <ChordSheet />. Its twin is the
// offscreen calculator (../hooks/useAutoFitOffscreen), which renders the real
// component and is the GROUND TRUTH - this analytic version is tuned to flip at
// the same boundaries and validated against it in the playground. When the two
// disagree, the offscreen hook is right. The React wrapper around this engine is
// useAutoFitAnalytic. Subsystem overview: ../components/views/CHORDSHEET.md.
//
// Goal: pick the LARGEST font size and the column count (1..8) that lets a whole
// song fit one screen with NO scrolling - critical for live performance.
//
// We do this WITHOUT rendering anything (no offscreen DOM, no reflow):
//   - WIDTH is measured with a Canvas 2D context (`measureText`), which uses the
//     real loaded-font glyph metrics. This is the only reliable way to get
//     proportional/Hebrew (Heebo) line widths; a char-count formula is hopeless
//     for variable-width glyphs.
//   - HEIGHT is purely analytic: each line type contributes a fixed multiple of
//     the font size (em), read straight from ChordSheet's styles.
//
// These two cheap functions drive the same columns-1->8 / binary-search-font
// loop as the offscreen calculator.
//
// Accepted simplification: each parsed line is modelled as ONE visual row. The
// horizontal constraint keeps lines from wrapping in practice, so the one-row
// assumption holds.
//
// The horizontal model mirrors the offscreen calculator (the rendered-component
// ground truth), which separates two failure modes: a LYRIC/text row wraps once
// it exceeds the column, but an absolutely-positioned CHORD row only collides
// with the next column once it overhangs by MORE than a full column-gap. So we
// track lyric and chord widths separately and check the chord against
// `columnWidth + gap`, not the bare column - otherwise the math rejects fonts
// the renderer happily accepts and picks a smaller size / more columns.
// ---------------------------------------------------------------------------

export type FontMode = 'proportional' | 'mono';

// Must match ChordSheet's LYRIC_FONT / CHORD_FONT families.
const FONT_FAMILY: Record<FontMode, string> = {
  proportional: "'Heebo', sans-serif",
  mono: "'Cousine', 'Courier New', monospace",
};

// Chords render at 0.8em, bold (CHORD_FONT_SIZE / fontWeight 700 in the sheet).
// Keep this in sync with CHORD_FONT_SIZE in ChordSheet.tsx.
const CHORD_EM = 0.8;

// Vertical box of each line type, in em of the sheet font size. Derived from the
// inline styles in ChordSheet.tsx (kept in sync by hand):
//   chords+lyric block : chord layer 0.97 + lyric lineHeight 1.2 + margin 0.2
//   standalone chords  : minHeight 1.15 + margin 0.05
//   plain lyric        : lineHeight 1.2 + margin 0.15
//   directive          : marginTop 0.5 + ~lineHeight 1.35 + marginBottom 0.1
//   cue                : ~lineHeight 1.35 + marginBottom 0.1
//   empty              : height 0.7
const LINE_HEIGHT_EM: Record<LineType | 'chordLyric', number> = {
  chordLyric: 2.37,
  chords: 1.2, // standalone chord line (no lyric beneath)
  lyric: 1.35,
  directive: 1.95,
  cue: 1.45,
  empty: 0.7,
};

// One offscreen (never-attached) canvas context, created lazily and reused.
let _ctx: CanvasRenderingContext2D | null = null;
function getCtx(): CanvasRenderingContext2D | null {
  if (_ctx) return _ctx;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  _ctx = canvas.getContext('2d');
  return _ctx;
}

/** Measure a single string's rendered width in px for the given font params. */
function measureText(
  text: string,
  px: number,
  family: string,
  weight: 400 | 600 | 700
): number {
  const ctx = getCtx();
  if (!ctx || !text) return 0;
  ctx.font = `${weight} ${px}px ${family}`;
  return ctx.measureText(text).width;
}

/** The on-screen chord text for a chord line (transposed + display-formatted). */
function chordText(line: ParsedLine, keyOffset: number): string {
  return formatChordLineForDisplay(
    transposeChordLine(line.raw || line.text, keyOffset)
  );
}

/**
 * A measured block: what actually renders as one vertical unit. A `chords` line
 * followed by a `lyric` line collapses into a single `chordLyric` block (mirrors
 * renderLines in ChordSheet).
 */
interface Block {
  heightEm: number;
  /**
   * Pre-measured width at REF_PX of the block's widest LEAF text row - the lyric
   * for a paired/plain block, the chord text for a standalone chord/directive/cue
   * row (scale by fontSize/REF_PX for any size). A leaf row wider than the column
   * wraps or overflows, so this is checked against the column width directly.
   */
  lyricWidthAtRef: number;
  /**
   * For a paired chords+lyric block: the transformed chord line and the lyric,
   * kept so we can run the SAME placement geometry the renderer uses (via
   * ./chordPlacement) and predict how far individual chords overhang the column
   * edge - the real cause of horizontal sheet overflow (an analytic chord-row
   * width can't see a single chord token pushed past the lyric's far edge).
   * Undefined for non-paired blocks.
   */
  paired?: { transformed: string; lyric: string };
}

// Measure widths once at a reference size; `measureText` width is linear in px,
// so any candidate size is just a multiply. Keeps the binary search allocation-free.
const REF_PX = 100;

/**
 * Walk the parsed lines exactly like renderLines does and produce the list of
 * vertical blocks with their height (em) and reference width (px at REF_PX).
 */
function walkBlocks(
  song: ParsedSong,
  font: FontMode,
  keyOffset: number
): Block[] {
  const family = FONT_FAMILY[font];
  const lines = song.lines;
  const blocks: Block[] = [];

  const lyricWidth = (l: ParsedLine) => measureText(l.text, REF_PX, family, 400);
  const chordWidth = (l: ParsedLine) =>
    measureText(chordText(l, keyOffset), REF_PX * CHORD_EM, family, 700);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.type === 'chords') {
      const next = lines[i + 1];
      if (next && next.type === 'lyric') {
        // Paired block: the lyric must fit the column (else it wraps); the chord
        // row's overhang is judged separately by the placement model, so we keep
        // the chord+lyric strings for chordOverhangPx.
        blocks.push({
          heightEm: LINE_HEIGHT_EM.chordLyric,
          lyricWidthAtRef: lyricWidth(next),
          paired: { transformed: chordText(line, keyOffset), lyric: next.text },
        });
        i++; // consume the lyric line
      } else {
        // Standalone chord row: a leaf text row that OVERFLOWS rather than
        // overhangs (white-space:nowrap, no lyric beneath), so the offscreen
        // probe judges it like a lyric - it must fit the column with no gap slack.
        blocks.push({
          heightEm: LINE_HEIGHT_EM.chords,
          lyricWidthAtRef: chordWidth(line),
        });
      }
      continue;
    }

    if (line.type === 'lyric') {
      blocks.push({
        heightEm: LINE_HEIGHT_EM.lyric,
        lyricWidthAtRef: lyricWidth(line),
      });
      continue;
    }

    if (line.type === 'directive') {
      blocks.push({
        heightEm: LINE_HEIGHT_EM.directive,
        lyricWidthAtRef: measureText(line.text, REF_PX, family, 700),
      });
      continue;
    }

    if (line.type === 'cue') {
      blocks.push({
        heightEm: LINE_HEIGHT_EM.cue,
        lyricWidthAtRef: measureText(line.text, REF_PX, family, 600),
      });
      continue;
    }

    // empty
    blocks.push({ heightEm: LINE_HEIGHT_EM.empty, lyricWidthAtRef: 0 });
  }

  return blocks;
}

/** Overhang (px) of a paired block's chords past the column's two edges. */
interface ChordOverhang {
  /** How far the rightmost chord sticks out past the column's right edge. */
  right: number;
  /** How far the leftmost chord sticks out past the column's left edge. */
  left: number;
}

/**
 * Predict how far a paired block's chords overhang its column, by running the
 * SAME placement geometry the renderer uses (deriveContext + placeChords from
 * ./chordPlacement) on canvas-measured glyphs.
 *
 * This catches what the analytic chord-ROW width misses: an individual chord
 * token placed past the lyric's far edge (RTL right-align / LTR extrapolation)
 * grows the sheet's scrollWidth even when the whole chord line is narrower than
 * the column. The offscreen ground truth sees this via scrollWidth; here we
 * reproduce it without a DOM.
 *
 * Coordinate frame: the renderer measures glyphs relative to the WRAPPER's left
 * edge, and the wrapper is exactly `columnWidth` wide. For RTL the lyric
 * right-aligns to the wrapper's right edge, so we offset the (lyric-local)
 * canvas positions so the lyric's right edge lands at `columnWidth`; for LTR the
 * lyric starts at the wrapper left (offset 0). Chord positions then come out in
 * the same wrapper-relative frame, and overhang is measured against [0, columnWidth].
 */
function chordOverhangPx(
  block: Block,
  columnWidth: number,
  fontSize: number,
  font: FontMode,
  isRtl: boolean,
  family: string
): ChordOverhang {
  const none = { right: 0, left: 0 };
  if (!block.paired) return none;
  const { transformed, lyric } = block.paired;
  if (lyric.length === 0) return none;

  // Per-char cumulative widths at the real font size. The renderer wraps each
  // char in its own <span>, which suppresses cross-char kerning - measuring char
  // by char (not the whole substring) matches that, in VISUAL order. For RTL the
  // visual order is the logical string reversed.
  const visual = isRtl ? [...lyric].reverse() : [...lyric];
  const measured: MeasuredGlyph[] = [];
  let x = 0;
  for (const ch of visual) {
    const w = measureText(ch, fontSize, family, 400);
    measured.push({ left: x, right: x + w, isSpace: ch.trim() === '' });
    x += w;
  }
  const lyricTotalW = x;

  // Shift into the wrapper frame: RTL right-aligns the lyric to columnWidth.
  const offset = isRtl ? columnWidth - lyricTotalW : 0;
  if (offset !== 0) {
    for (const g of measured) {
      g.left += offset;
      g.right += offset;
    }
  }

  const tokens = tokenizeChordLine(transformed);
  const ctx = deriveContext(measured, tokens, transformed.length);
  if (!ctx) return none;
  const placements = placeChords(ctx, font, isRtl);

  // Each chord's box spans its text width. For left-anchored placements that's
  // [left, left + w]; for RIGHT-anchored ones (RTL, anchorRight) the label is
  // shifted left by its own width so the box is [left - w, left] - matching the
  // renderer's translateX(-100%). Overhang is how far the extreme chord edges
  // fall outside the column box [0, columnWidth].
  let maxRight = -Infinity;
  let minLeft = Infinity;
  for (const p of placements) {
    const w = measureText(p.text, fontSize * CHORD_EM, family, 700);
    const boxLeft = p.anchorRight ? p.left - w : p.left;
    const boxRight = p.anchorRight ? p.left : p.left + w;
    maxRight = Math.max(maxRight, boxRight);
    minLeft = Math.min(minLeft, boxLeft);
  }
  if (!isFinite(maxRight)) return none;

  return {
    right: Math.max(0, maxRight - columnWidth),
    left: Math.max(0, -minLeft),
  };
}

/**
 * Worst-case chord overhang (px) across all paired blocks at a candidate (cols,
 * fontSize): the largest right-edge and left-edge overhang any chord makes past
 * its column. We can't know which block lands in an outer column, so the worst
 * on each side governs (see chordsCollide for how it's judged).
 */
function predictedSheetOverhang(
  blocks: Block[],
  cols: number,
  fontSize: number,
  font: FontMode,
  isRtl: boolean,
  family: string,
  availW: number,
  gap: number
): ChordOverhang {
  const columnWidth = (availW - (cols - 1) * gap) / cols;
  let maxRight = 0;
  let maxLeft = 0;
  for (const b of blocks) {
    if (!b.paired) continue;
    const o = chordOverhangPx(b, columnWidth, fontSize, font, isRtl, family);
    if (o.right > maxRight) maxRight = o.right;
    if (o.left > maxLeft) maxLeft = o.left;
  }
  return { right: maxRight, left: maxLeft };
}

/**
 * Whether any chord overhangs its column by MORE than the renderer tolerates.
 *
 * This is the analytic twin of the offscreen probe's per-chord collision check:
 * a chord is fine sitting a little past its column's reading edge (it lands in
 * the empty column gap), and only actually collides with the neighbouring column
 * once it crosses MORE than a full gap past the wrapper edge - on EITHER side.
 * So the limit is `gap` of overhang per side (plus the shared TOL slack), checked
 * independently, not summed. Equivalent at the boundary to the measured
 * scrollWidth overflow (both flip when an overhang crosses one gap), but without
 * the per-px width arithmetic that mis-modelled the 1-column / right-edge cases.
 */
function chordsCollide(o: ChordOverhang, gap: number): boolean {
  return o.right > gap + HFIT_PX || o.left > gap + HFIT_PX;
}

/**
 * Height (px) of the tallest column when the ordered block list is split into
 * `cols` columns the way CSS `column-fill: balance` does.
 *
 * Balancing splits the blocks into `cols` CONTIGUOUS groups (source order is
 * preserved; break-inside:avoid keeps each block atomic) and minimises the
 * tallest group - the container's height is that tallest column. That is exactly
 * the "linear partition / minimise the maximum segment sum" problem, which we
 * solve EXACTLY by binary-searching the answer:
 *
 *   feasible(H) = can we walk the blocks left-to-right, starting a new column
 *   whenever the next block would push the current column past H, and use no
 *   more than `cols` columns? The smallest feasible H is the balanced height.
 *
 * Greedy first-fit (the previous model) overshot: it forced the per-column
 * target up front and piled every overflow onto the LAST column, predicting a
 * taller column than the browser actually renders - which made the math reject
 * font sizes the real (offscreen-measured) sheet accepts.
 */
function tallestColumnPx(blocks: Block[], cols: number, fontSize: number): number {
  const heights = blocks.map((b) => b.heightEm * fontSize);
  if (heights.length === 0) return 0;

  const tallestBlock = Math.max(...heights);
  const total = heights.reduce((s, h) => s + h, 0);
  // A single block can't be split, so the answer is at least the tallest block;
  // it's at most the whole song in one column.
  let lo = Math.max(tallestBlock, total / cols);
  let hi = total;

  // Greedily count the columns needed to keep every column <= limit.
  const columnsNeeded = (limit: number): number => {
    let used = 1;
    let cur = 0;
    for (const h of heights) {
      if (cur + h <= limit) {
        cur += h;
      } else {
        used++;
        cur = h;
      }
    }
    return used;
  };

  // Binary-search the smallest column height that fits within `cols` columns.
  // ~0.1px precision is far finer than the px comparisons that consume it.
  while (hi - lo > 0.1) {
    const mid = (lo + hi) / 2;
    if (columnsNeeded(mid) <= cols) hi = mid;
    else lo = mid;
  }
  return hi;
}

export interface AutoFitInput {
  song: ParsedSong;
  keyOffset: number;
  font: FontMode;
  /** Available area in px (the rendered-song region). */
  viewport: { width: number; height: number };
  /** Gap between columns in px (must match the sheet's columnGap). */
  gap?: number;
  /** Horizontal / vertical padding inside the viewport, in px. */
  padX?: number;
  padY?: number;
  /** Padding inside each column (px), subtracted from the usable text width. */
  columnPadding?: number;
  minFont?: number;
  maxFont?: number;
  minCols?: number;
  maxCols?: number;
}

// Slack on the width comparisons, matching the offscreen probe's flat `TOL = 2`
// (it accepts overflow/overhang up to 2px before flagging a wrap or collision).
// We use the same flat tolerance - no extra per-column fraction - so the math
// loosens/tightens in lockstep with what the rendered component actually does.
const HFIT_PX = 2;

export interface AutoFitResult {
  columns: number;
  fontSize: number;
}

/**
 * Find the (columns, fontSize) that maximizes font size while the whole song
 * fits the viewport with no scroll. For every column count we binary-search the
 * largest font that fits both constraints, and keep the column count whose best
 * font is strictly largest. We iterate columns LOW->HIGH with a strict ">", so
 * on a tie (e.g. several counts all hitting the font cap) the FEWEST columns
 * win - more columns only get chosen when they genuinely allow a bigger font.
 */
export function computeAutoFit(input: AutoFitInput): AutoFitResult {
  const {
    song,
    keyOffset,
    font,
    viewport,
    gap = 40,
    padX = 0,
    padY = 0,
    columnPadding = 0,
    minFont = 6,
    maxFont = 80,
    minCols = 1,
    maxCols = 8,
  } = input;

  const blocks = walkBlocks(song, font, keyOffset);
  const availW = viewport.width - padX;
  const availH = viewport.height - padY;

  let bestFont = minFont;
  let bestCols = minCols;
  if (availW <= 0 || availH <= 0 || blocks.length === 0) {
    return { columns: bestCols, fontSize: bestFont };
  }

  // Widest lyric/text row at the reference size; scales linearly with px. Lyrics
  // must fit the column or they wrap. Chord overflow is handled separately by the
  // precise placement model (sheetOverflowPx), not a row-width budget.
  const maxLyricAtRef = blocks.reduce((m, b) => Math.max(m, b.lyricWidthAtRef), 0);
  const isRtl = song.metadata.direction !== 'ltr';
  const family = FONT_FAMILY[font];

  for (let cols = minCols; cols <= maxCols; cols++) {
    const columnWidth = (availW - (cols - 1) * gap) / cols;
    if (columnWidth <= 0) continue;

    // Usable width inside a column for LYRICS/text rows: the column minus its own
    // padding and the shared 2px slack, so no lyric reaches the wrap point.
    const usableWidth = columnWidth - columnPadding - HFIT_PX;
    if (usableWidth <= 0) continue;

    let lo = minFont;
    let hi = maxFont;
    let bestForCols = 0;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      // Lyric/text rows must fit the column (no wrap). Chords must not collide
      // with a neighbouring column - judged by running the renderer's own
      // placement geometry and applying the same >gap-overhang rule the offscreen
      // probe uses (chordsCollide).
      const fitsLyrics = (maxLyricAtRef * mid) / REF_PX <= usableWidth;
      const overhang = predictedSheetOverhang(
        blocks, cols, mid, font, isRtl, family, availW, gap
      );
      const fitsChords = !chordsCollide(overhang, gap);
      const fitsHorizontally = fitsLyrics && fitsChords;
      const fitsVertically = tallestColumnPx(blocks, cols, mid) <= availH;
      if (fitsHorizontally && fitsVertically) {
        bestForCols = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (bestForCols > bestFont) {
      bestFont = bestForCols;
      bestCols = cols;
    }
  }

  return { columns: bestCols, fontSize: bestFont };
}

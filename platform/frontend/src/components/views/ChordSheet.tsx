import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { transposeChordLine } from '../../services/transpose';
import { formatChordLineForDisplay } from '../../services/chordDisplay';
import type { ParsedLine, ParsedSong } from '../../types';
import {
  deriveContext,
  placeChords,
  tokenizeChordLine,
  type ChordPlacement,
  type FontMode,
  type MeasuredGlyph,
} from './chordPlacement';

// ---------------------------------------------------------------------------
// Chord-sheet renderer. The PRODUCTION component (the playground at
// /tools/playground is just its dev harness). High-level overview of this whole
// subsystem - renderer + the two auto-fit calculators + the shared placement
// core - lives in ../../../CHORDSHEET.md (platform/CHORDSHEET.md).
//
// A song's chords are authored against a MONOSPACE character grid: a chord at
// source column `c` belongs above whatever lyric character sits at column `c`.
// This component reproduces that grid for any combination of:
//
//   - font mode: 'proportional' (Heebo) or 'mono' (Cousine, the classic look)
//   - direction: RTL (Hebrew) or LTR (English), from the song metadata
//
// That's a 2x2 of placement STRATEGIES (see below). Each strategy is a pure
// function: given the geometry the driver measured, it returns the chord
// x-positions. The shared DRIVER (`ChordLyricLine`) owns everything else -
// transpose + tokenize the chord line, render the lyric one char per span,
// measure each glyph after layout (re-measuring on font load / resize), pick
// the strategy, and absolutely-position the chords over the lyric.
//
// Chords are placed by their LAST character in RTL (so e.g. the "m" in "F#m"
// lands on its target glyph) and by their FIRST character in LTR. For
// "אני למעלה עכשיו, הפסקתי ליפול" with C@0 D@7 Em@20 (RTL): C over פ (ליפול),
// D over ס (הפסקתי), and Em's m over מ (למעלה) - matching the songbook.
//
// A standalone chords line (intro, no lyric) has nothing to measure, so it
// falls back to a spaced chord row.
// ---------------------------------------------------------------------------

const COLORS = {
  chord: '#0000ff',
  lyric: '#1a1a1a',
  directive: '#228b22', // {} section headers - green/teal
  cue: '#dc143c', // [] cues - red
};

// Chords render a bit smaller than the lyric (relative to the lyric em size),
// matching the reference songbook.
const CHORD_FONT_SIZE = '0.8em';

// Rendered width of one LEADING-indent space in the proportional font. A natural
// proportional space is only ~0.25em, which crams a chord at the start of an
// indent against the first word; this widens it toward a full character cell so
// chords over the indent get room (see ChordLyricLine's lyric layer).
const LEADING_SPACE_EM = '0.6em';

// Width (in `ch` units) of one source space column for STANDALONE chord rows
// (no lyric to measure against). Tuned so the row spans roughly the same
// relative widths as the monospace source, with comfortable gaps between
// chords that have no lyric beneath them.
const COL_CH = 0.9;

// Lyric/chord font family per mode. The chord layer MUST use the SAME family as
// the lyric it aligns to, so the two share glyph metrics. FontMode and the chord
// placement strategies now live in ./chordPlacement (shared with the auto-fit
// calculator, so both place chords with identical geometry).
const LYRIC_FONT: Record<FontMode, string> = {
  proportional: "'Heebo', sans-serif",
  mono: "'Cousine', 'Courier New', monospace",
};
const CHORD_FONT = LYRIC_FONT;

/**
 * A paired chords+lyric block - the shared DRIVER for all four placement
 * strategies.
 *
 * It owns the mechanics: transpose + tokenize the chord line, render the lyric
 * one char per span, measure every glyph after layout (re-measuring on font load
 * and resize), bundle that geometry, and hand it to the strategy chosen by
 * (font mode, direction). The strategy returns chord x-positions; the driver
 * absolutely-positions the chord spans over the lyric. The lyric and chord
 * layers use the font family for the active mode (Heebo vs Cousine) so their
 * glyph metrics match the strategy's assumptions.
 */
function ChordLyricLine({
  chordLine,
  lyricLine,
  keyOffset,
  isRtl,
  font,
}: {
  chordLine: ParsedLine;
  lyricLine: ParsedLine;
  keyOffset: number;
  isRtl: boolean;
  font: FontMode;
}) {
  const transformed = formatChordLineForDisplay(
    transposeChordLine(chordLine.raw || chordLine.text, keyOffset)
  );
  const tokens = tokenizeChordLine(transformed);
  const lyric = lyricLine.text;
  // Leading-space run (a deliberate indent): widened below in proportional so
  // chords sitting over it aren't crammed against the first word.
  const leadingSpaces = lyric.length - lyric.trimStart().length;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const lyricRef = useRef<HTMLDivElement | null>(null);
  const [placements, setPlacements] = useState<ChordPlacement[]>([]);

  // Re-measure on mount and whenever inputs that affect layout change.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const lyricEl = lyricRef.current;
    if (!wrap || !lyricEl) return;

    const measure = () => {
      const wrapBox = wrap.getBoundingClientRect();
      const charEls = Array.from(
        lyricEl.querySelectorAll<HTMLElement>('[data-col]')
      );
      if (charEls.length === 0) {
        setPlacements([]);
        return;
      }

      // Left/right x (relative to wrapper) of every glyph, in VISUAL column
      // order (left-to-right). For RTL this is the reverse of logical order. We
      // also track which chars are spaces, in that same visual order. The shared
      // deriveContext/placeChords (./chordPlacement) turn these per-glyph
      // measurements into chord positions - the SAME code the auto-fit
      // calculator uses, so on-screen and predicted placement never drift.
      const measured: MeasuredGlyph[] = charEls
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            left: r.left - wrapBox.left,
            right: r.right - wrapBox.left,
            isSpace: (el.textContent ?? '').trim() === '',
          };
        })
        .sort((a, b) => a.left - b.left);

      const ctx = deriveContext(measured, tokens, transformed.length);
      setPlacements(ctx ? placeChords(ctx, font, isRtl) : []);
    };

    measure();
    // Fonts may load after first paint and shift glyph widths; re-measure then.
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});

    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lyric, transformed, keyOffset, font, isRtl]);

  return (
    // NOTE: the vertical box of each line type (this margin + the chord layer
    // height + the lyric lineHeight, and the equivalents in the other line
    // components below) is mirrored analytically in LINE_HEIGHT_EM in
    // ../../utils/autoFitAnalytic.ts. Change a margin/lineHeight here and that
    // table must be updated to match, or the analytic auto-fit calculator's
    // height prediction drifts from what actually renders.
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        marginBottom: '0.2em',
        direction: isRtl ? 'rtl' : 'ltr',
        textAlign: isRtl ? 'right' : 'left',
        // Keep the chord layer and its lyric together: a column break must never
        // land between them (a chord row stranded at the bottom of a column with
        // its lyric pushed to the next). Both flow to the next column as a unit.
        breakInside: 'avoid',
      }}
    >
      {/* chord layer (LTR so absolute `left` offsets are measured from the left).
          Height ~= one chord line-box (CHORD_FONT_SIZE 0.8em x ~1.2 normal
          line-height = 0.96em); the small remainder is the gap down to the lyric.
          If CHORD_FONT_SIZE changes, retune this and LINE_HEIGHT_EM.chordLyric. */}
      <div style={{ position: 'relative', height: '0.97em', direction: 'ltr' }}>
        {placements.map((p, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: `${p.left}px`,
              // RTL placements anchor by the chord's RIGHT edge (so its last
              // char lands on the target lyric column): translateX(-100%) shifts
              // the span left by its own width, putting its right edge at `left`.
              transform: p.anchorRight ? 'translateX(-100%)' : undefined,
              fontFamily: CHORD_FONT[font],
              fontSize: CHORD_FONT_SIZE,
              fontWeight: 700,
              color: COLORS.chord,
              whiteSpace: 'nowrap',
            }}
          >
            {p.text}
          </span>
        ))}
      </div>
      {/* lyric layer (measured) - natural direction, one span per char */}
      <div
        ref={lyricRef}
        style={{
          fontFamily: LYRIC_FONT[font],
          color: COLORS.lyric,
          lineHeight: 1.2,
          whiteSpace: 'pre-wrap',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
      >
        {[...lyric].map((ch, i) => (
          <span
            key={i}
            data-col={i}
            // A LEADING run of spaces is a deliberate indent the chords above it
            // sit over. Proportional spaces are thin (~0.25em), so a chord at the
            // start of the indent ends up almost touching the first word. Widen
            // each leading space toward a full character cell so the indent gives
            // the chord room. Physically widening the span (vs. shifting in JS)
            // moves the glyphs after it too, so chords measured over real
            // characters stay aligned. Mono cells are already full width.
            style={
              font === 'proportional' && i < leadingSpaces
                ? { display: 'inline-block', width: LEADING_SPACE_EM }
                : undefined
            }
          >
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * A standalone chords line (intro / instrumental) with no lyric to measure.
 * Renders chords in source order, spaced by their source-column gaps.
 */
function StandaloneChordLine({
  chordLine,
  keyOffset,
  isRtl,
  font,
}: {
  chordLine: ParsedLine;
  keyOffset: number;
  isRtl: boolean;
  font: FontMode;
}) {
  const transformed = formatChordLineForDisplay(
    transposeChordLine(chordLine.raw || chordLine.text, keyOffset)
  );
  const tokens = tokenizeChordLine(transformed);

  const children: ReactNode[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const prevEnd = i === 0 ? 0 : tokens[i - 1].col + tokens[i - 1].text.length;
    const gap = Math.max(i === 0 ? 0 : 1, tokens[i].col - prevEnd);
    if (gap > 0) {
      children.push(
        <span
          key={`g${i}`}
          style={{ display: 'inline-block', width: `${gap * COL_CH}ch` }}
        />
      );
    }
    children.push(
      <span
        key={`c${i}`}
        style={{
          fontFamily: CHORD_FONT[font],
          fontSize: CHORD_FONT_SIZE,
          fontWeight: 700,
          color: COLORS.chord,
        }}
      >
        {tokens[i].text}
      </span>
    );
  }

  return (
    <div
      style={{
        // Chords keep source order (LTR), but the row hugs the column's reading
        // edge (right in an RTL song), matching the reference.
        direction: 'ltr',
        textAlign: isRtl ? 'right' : 'left',
        whiteSpace: 'nowrap',
        lineHeight: 1.15,
        minHeight: '1.15em',
        marginBottom: '0.05em',
      }}
    >
      {children}
    </div>
  );
}

/** A lyric line that has NO chords above it. Rendered in its natural direction. */
function PlainLyricLine({
  line,
  isRtl,
  font,
}: {
  line: ParsedLine;
  isRtl: boolean;
  font: FontMode;
}) {
  const text = line.text.length === 0 ? ' ' : line.text;
  return (
    <div
      style={{
        fontFamily: LYRIC_FONT[font],
        color: COLORS.lyric,
        lineHeight: 1.2,
        whiteSpace: 'pre-wrap',
        direction: isRtl ? 'rtl' : 'ltr',
        textAlign: isRtl ? 'right' : 'left',
        marginBottom: '0.15em',
      }}
    >
      {text}
    </div>
  );
}

function DirectiveLine({ line, isRtl }: { line: ParsedLine; isRtl: boolean }) {
  return (
    <div
      style={{
        fontFamily: "'Heebo', sans-serif",
        color: COLORS.directive,
        fontWeight: 700,
        marginTop: '0.5em',
        marginBottom: '0.1em',
        // Section labels read naturally (RTL for Hebrew), unlike the
        // source-ordered lyric/chord body.
        direction: isRtl ? 'rtl' : 'ltr',
        textAlign: isRtl ? 'right' : 'left',
      }}
    >
      {line.text}
    </div>
  );
}

function CueLine({ line, isRtl }: { line: ParsedLine; isRtl: boolean }) {
  return (
    <div
      style={{
        fontFamily: "'Heebo', sans-serif",
        color: COLORS.cue,
        fontWeight: 600,
        marginBottom: '0.1em',
        direction: isRtl ? 'rtl' : 'ltr',
        textAlign: isRtl ? 'right' : 'left',
      }}
    >
      {line.text}
    </div>
  );
}

/**
 * Walk the parsed lines and render them. A `chords` line consumes the following
 * `lyric` line (if present) so the two render as one aligned block.
 */
function renderLines(
  lines: ParsedLine[],
  keyOffset: number,
  isRtl: boolean,
  font: FontMode
) {
  const out: ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.type === 'chords') {
      const next = lines[i + 1];
      const lyricLine = next && next.type === 'lyric' ? next : null;
      if (lyricLine) {
        out.push(
          <ChordLyricLine
            key={i}
            chordLine={line}
            lyricLine={lyricLine}
            keyOffset={keyOffset}
            isRtl={isRtl}
            font={font}
          />
        );
        i++; // consume the paired lyric line
      } else {
        out.push(
          <StandaloneChordLine
            key={i}
            chordLine={line}
            keyOffset={keyOffset}
            isRtl={isRtl}
            font={font}
          />
        );
      }
      continue;
    }

    if (line.type === 'lyric') {
      out.push(<PlainLyricLine key={i} line={line} isRtl={isRtl} font={font} />);
      continue;
    }

    if (line.type === 'directive') {
      out.push(<DirectiveLine key={i} line={line} isRtl={isRtl} />);
      continue;
    }

    if (line.type === 'cue') {
      out.push(<CueLine key={i} line={line} isRtl={isRtl} />);
      continue;
    }

    // empty
    out.push(<div key={i} style={{ height: '0.7em' }} />);
  }

  return out;
}

export interface ChordSheetProps {
  /** The parsed song to render. */
  song: ParsedSong;
  /** Transposition offset in semitones (default 0). */
  keyOffset?: number;
  /**
   * Explicit number of columns. When set, takes precedence over `columnWidth`
   * (the layout splits into exactly this many columns). When omitted, columns
   * flow to fit `columnWidth`.
   */
  columns?: number;
  /** Width of each layout column in px (default 460). Ignored when `columns` is set. */
  columnWidth?: number;
  /** Gap between columns in px (default 40). */
  columnGap?: number;
  /** Base font size in px for the lyrics (default 20). */
  fontSize?: number;
  /**
   * Font mode for the chord/lyric grid (default 'proportional'): 'proportional'
   * (Heebo) or 'mono' (Cousine monospace, the classic songbook look).
   */
  font?: FontMode;
  /** Optional style overrides merged onto the outer container. */
  style?: CSSProperties;
}

/**
 * Renders a parsed song as a chord sheet (chords positioned above the matching
 * lyric syllables, multi-column flow). Direction is auto-detected from the
 * song; the `font` prop picks proportional (Heebo) or monospace (Cousine)
 * rendering. Pure presentation: give it a song and a key offset.
 */
export function ChordSheet({
  song,
  keyOffset = 0,
  columns,
  columnWidth = 460,
  columnGap = 40,
  fontSize = 20,
  font = 'proportional',
  style,
}: ChordSheetProps) {
  const isRtl = song.metadata.direction !== 'ltr';

  const body = useMemo<ReactNode>(
    () => renderLines(song.lines, keyOffset, isRtl, font),
    [song.lines, keyOffset, isRtl, font]
  );

  // An explicit column count wins over flow-to-fit `columnWidth`.
  const columnStyle: CSSProperties = columns
    ? { columnCount: columns }
    : { columnWidth };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        direction: isRtl ? 'rtl' : 'ltr',
        textAlign: isRtl ? 'right' : 'left',
        fontSize,
        columnGap,
        ...columnStyle,
        ...style,
      }}
    >
      {body}
    </div>
  );
}

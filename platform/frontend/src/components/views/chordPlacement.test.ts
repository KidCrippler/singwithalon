import { describe, expect, it } from 'vitest';
import {
  deriveContext,
  placeChords,
  tokenizeChordLine,
  type MeasuredGlyph,
} from './chordPlacement';

// Real authored data for the line "אני למעלה עכשיו, הפסקתי ליפול" from song
// 1000366 ("אהבה קטנה"). Chord line: C@0 D@7 Em@20.
const LYRIC = 'אני למעלה עכשיו, הפסקתי ליפול'; // len 29
const CHORD_SRC = 'C      D            Em     '; // len 27

// Build uniform-monospace glyph measurements: n cells, each `cell` px wide, laid
// out left-to-right from x=0. Mirrors what the renderer measures for a true
// monospace font (Cousine). Visual left-to-right order; for an RTL lyric the DOM
// lays logical char 0 at the far RIGHT, so visual column v holds logical (n-1-v).
function monoGlyphs(lyric: string, cell = 10): MeasuredGlyph[] {
  const n = lyric.length;
  return Array.from({ length: n }, (_, v) => ({
    left: v * cell,
    right: (v + 1) * cell,
    isSpace: lyric[n - 1 - v] === ' ',
  }));
}

// Non-uniform widths so the proportional case exercises the snap-to-measured
// path rather than uniform-grid math. Returns the glyphs plus, for assertions,
// the right-edge x of each LOGICAL index.
function propGlyphs(lyric: string) {
  const n = lyric.length;
  const width = (logical: number) =>
    lyric[logical] === ' ' ? 6 : 9 + ((logical * 7) % 6); // 9..14 px
  const glyphs: MeasuredGlyph[] = [];
  const rightOfLogical: number[] = new Array(n);
  let x = 0;
  for (let v = 0; v < n; v++) {
    const logical = n - 1 - v;
    const w = width(logical);
    glyphs.push({ left: x, right: x + w, isSpace: lyric[logical] === ' ' });
    rightOfLogical[logical] = x + w;
    x += w;
  }
  return { glyphs, rightOfLogical };
}

describe.each([
  { font: 'mono' as const },
  { font: 'proportional' as const },
])('RTL chord placement, right-anchored by last char ($font)', ({ font }) => {
  it('puts the LAST char of C->פ(26), D->ס(19), Em->מ(5); flags anchorRight', () => {
    const tokens = tokenizeChordLine(CHORD_SRC);

    // Build glyphs and the right-edge lookup for whichever font we're testing.
    const cell = 10;
    const n = LYRIC.length;
    const built =
      font === 'mono'
        ? {
            glyphs: monoGlyphs(LYRIC, cell),
            // logical index `logical` is at visual column n-1-logical; its right
            // edge is therefore (n-1-logical+1)*cell = (n-logical)*cell.
            rightOf: (logical: number) => (n - logical) * cell,
          }
        : (() => {
            const { glyphs, rightOfLogical } = propGlyphs(LYRIC);
            return { glyphs, rightOf: (logical: number) => rightOfLogical[logical] };
          })();

    const ctx = deriveContext(built.glyphs, tokens, CHORD_SRC.length);
    expect(ctx).not.toBeNull();
    const placements = placeChords(ctx!, font, /* isRtl */ true);
    const by = Object.fromEntries(placements.map((p) => [p.text, p]));

    // Every RTL placement is right-anchored.
    for (const p of placements) expect(p.anchorRight).toBe(true);

    // `left` is the RIGHT edge the chord's last char must reach: the right edge
    // of the target lyric cell.
    expect(by['C'].left).toBeCloseTo(built.rightOf(26), 5); // פ in ליפול
    expect(LYRIC[26]).toBe('פ');
    expect(by['D'].left).toBeCloseTo(built.rightOf(19), 5); // ס in הפסקתי
    expect(LYRIC[19]).toBe('ס');
    expect(by['Em'].left).toBeCloseTo(built.rightOf(5), 5); // m over מ in למעלה
    expect(LYRIC[5]).toBe('מ');
  });
});

// LTR glyphs in natural (logical == visual) order, with a NARROW leading indent:
// `narrow` px per leading space (proportional spaces are thin), `glyph` px per
// real character afterward. Reproduces song 4000137's indented chorus line.
function ltrGlyphs(lyric: string, narrow = 4, glyph = 9): MeasuredGlyph[] {
  const out: MeasuredGlyph[] = [];
  let x = 0;
  let seenGlyph = false;
  for (const ch of lyric) {
    const isSpace = ch === ' ';
    const w = !seenGlyph && isSpace ? narrow : glyph;
    out.push({ left: x, right: x + w, isSpace });
    if (!isSpace) seenGlyph = true;
    x += w;
  }
  return out;
}

describe('LTR chord placement over a deeply indented lyric (song 4000137)', () => {
  // "As long as you love me" pushed right by a 17-space indent; chord row
  // "-->  F   C   Am      E" authored over it. E@21 must land on the 'o' (col 21)
  // in "long", and the indent chords (-->, F, C, Am) spread across the indent
  // without drifting onto the lyric.
  const lyric = '                 As long as you love me'; // 17 spaces + text, len 39
  const chordSrc = '-->  F   C   Am      E'; // len 22

  it('anchors E exactly on the o (col 21) and keeps indent chords left of the first word', () => {
    const narrow = 4,
      glyph = 9;
    const glyphs = ltrGlyphs(lyric, narrow, glyph);
    const tokens = tokenizeChordLine(chordSrc);
    const ctx = deriveContext(glyphs, tokens, chordSrc.length);
    expect(ctx).not.toBeNull();
    const placements = placeChords(ctx!, 'proportional', /* isRtl */ false);
    const by = Object.fromEntries(placements.map((p) => [p.text, p.left]));

    // E (LTR, left-anchored) sits on the measured left edge of col 21 ('o').
    expect(lyric[21]).toBe('o');
    expect(by['E']).toBeCloseTo(glyphs[21].left, 5);

    // The first real glyph ('A', col 17) starts here; all indent chords must be
    // strictly left of it (no overlap onto the lyric).
    const firstGlyphLeft = glyphs[17].left;
    for (const t of ['-->', 'F', 'C', 'Am']) {
      expect(by[t]).toBeLessThan(firstGlyphLeft);
    }
    // And they stay in source order, spread (not all bunched at 0).
    expect(by['-->']).toBeLessThan(by['F']);
    expect(by['F']).toBeLessThan(by['C']);
    expect(by['C']).toBeLessThan(by['Am']);
  });
});

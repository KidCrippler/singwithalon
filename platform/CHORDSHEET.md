# Chord-Sheet Renderer & Auto-Fit

The subsystem that draws a song's chords above its lyrics, and picks the largest
font/column layout that fits one screen. It spans a reusable renderer
(`ChordSheet`), a shared placement core (`chordPlacement`), two auto-fit
calculators, and a developer harness (`PlaygroundView`, route `/tools/playground`)
where the renderer and calculators were built and are verified.

This doc is the map. Each file also carries a header comment with the details.
All paths below are relative to `platform/frontend/src/`.

---

## The problem

Songs are authored against a **monospace character grid**: a chord written at
source column `c` belongs above whatever lyric character sits at column `c`.

```
    C    D            Em 
אני למעלה עכשיו, הפסקתי ליפול

C above פ in ליפול
D above ס in הפסקתי
Em, the m should be above the מ in למעלה

-->  F   C   Am      E
                 As long as you love me
 
 E above o in long
```

Reproducing that grid is only trivial in one of four cases. It must work for:

- **font mode** — `proportional` (Heebo, variable-width glyphs) or `mono`
  (Cousine, the classic fixed-width songbook look)
- **direction** — RTL (Hebrew) or LTR (English), from the song metadata

Proportional glyphs and RTL right-alignment both break the naïve "column × char
width" mapping, so we measure real glyph positions and place each chord onto the
glyph it belongs over. That's a **2×2 of placement strategies** over one shared
mechanism.

A second problem rides on top: for live performance the whole song must fit **one
screen with no scrolling** at the largest readable font. That's the **auto-fit**
job — pick `(fontSize, columns)`.

---

## File map

```
components/views/
  ChordSheet.tsx          the renderer (production component)
  chordPlacement.ts       SHARED geometry: glyphs -> chord x-positions
  PlaygroundView.tsx      dev harness: controls + song fetch + debug overlay
utils/
  autoFitAnalytic.ts      auto-fit engine: canvas/analytic, no DOM (computeAutoFit)
hooks/
  useAutoFitAnalytic.ts   React wrapper around the analytic engine
  useAutoFitOffscreen.ts  auto-fit via hidden real renders (ground truth)
```

Dependency direction (arrows = "imports / drives"):

```
PlaygroundView
  ├─> ChordSheet ───────────┐
  ├─> autoFitAnalytic        ├─> chordPlacement   (the shared core)
  └─> useAutoFitOffscreen ───┘        │
            └─> ChordSheet ───────────┘

useAutoFitAnalytic ──> autoFitAnalytic   (React-hook wrapper; not used by the playground)
```

`chordPlacement.ts` is the keystone: the renderer and *both* auto-fit calculators
call the same `deriveContext` + `placeChords`, so predicted placement can't drift
from what actually draws.

---

## chordPlacement.ts — the shared core

Pure geometry, no DOM and no React. Two halves:

1. **`deriveContext(measured, tokens, chordLen)`** — turns per-glyph measurements
   (each lyric char's `left`/`right`/`isSpace`, in **visual** left-to-right order)
   into a `PlacementContext`: the column→x grid (`lefts`, with the leading indent
   spread), the left reading edge (`lyricLeftX`), and a representative column width
   (`colW` = median non-space glyph gap, used for extrapolation past either end).
   It's pure — it doesn't care whether the glyphs were measured from the live DOM
   (`getBoundingClientRect`) or analytically (canvas `measureText`).

2. **`placeChords(ctx, font, isRtl)`** — picks a strategy by `(font, direction)`
   and returns each chord's `left` (px from the wrapper's left edge):

   |        | LTR (eng) — left-anchored              | RTL (heb) — right-anchored                 |
   |--------|----------------------------------------|--------------------------------------------|
   | **proportional** | `propEng`: snap each chord's LEFT edge onto the measured glyph at its source column, extrapolate by `colW` past either end | `propHeb` = `placeRtl` |
   | **mono**         | `monoEng`: `col` cells from the left reading edge | `monoHeb` = `placeRtl` |

   **Anchoring differs by direction.** LTR chords are placed by their **left**
   edge (the first char sits at its source column). RTL chords are placed by their
   **right** edge: both Hebrew strategies are the *same* function, `placeRtl`,
   because once the lyric glyphs are measured the only font difference is baked
   into `lefts`. `placeRtl` anchors each chord by its **last character** — that
   char is at source column `col + text.length − 1`, which (the block mirrors when
   rendered RTL) maps to lyric logical index `j = (chordLen − 1) − lastCol`. It
   returns the right edge of that lyric cell and sets `anchorRight: true`; the
   renderer then shifts the whole label left by its own width (CSS
   `translateX(-100%)`), so e.g. the **m** in "F#m" lands on the target column and
   "F#" trails to its left. The analytic overhang calculator honours `anchorRight`
   too (chord box is `[left − w, left]` instead of `[left, left + w]`).

   `tokenizeChordLine` splits a chord line into `{col, text}` tokens (column =
   character index in the monospace source).

One subtlety lives here: a **leading run of spaces** (a lyric indented to push its
first word right) has no glyph to anchor to, so those indent columns are
distributed evenly across the *measured* indent width `[base, firstGlyphLeft]` —
spreading chords authored over the indent instead of bunching them. In
proportional mode the **renderer** also pre-widens each leading space toward a
full character cell (`LEADING_SPACE_EM`), so the indent is roomy before this runs.
See the comments in `deriveContext`.

---

## ChordSheet.tsx — the renderer

Pure presentation: give it a `ParsedSong` + `keyOffset` and it draws the sheet.
Direction is auto-detected (`metadata.direction`); `font`, `fontSize`, `columns`/
`columnWidth`, `columnGap` are props. Layout is CSS multi-column. Despite the
historical name "proportional", it renders **both** font modes — `font="mono"`
gives the monospace songbook look.

`renderLines` walks the parsed lines and emits one component per line type. A
`chords` line **consumes the following `lyric` line** so the pair renders as one
aligned block:

- **`ChordLyricLine`** — the driver. It transposes + tokenizes the chord line,
  renders the lyric **one `<span>` per char** (so it can measure each glyph),
  then in a `useLayoutEffect`:
  1. measures every glyph relative to the wrapper, in **visual** order (sorted by
     `left` — for RTL this reverses logical order),
  2. feeds them to `deriveContext` + `placeChords`,
  3. absolutely-positions each chord `<span>` at the returned `left`.

  It re-measures on font load (`document.fonts.ready` — web fonts shift glyph
  widths after first paint) and on resize (`ResizeObserver`). The chord layer is
  forced `direction: ltr` so the absolute `left` offsets are always measured from
  the left. `breakInside: avoid` keeps a chord row and its lyric in the same
  column.

- **`StandaloneChordLine`** — a chord line with no lyric beneath (intro /
  instrumental). Nothing to measure, so chords are laid out in source order spaced
  by their column gaps (`COL_CH` per source space).

- **`PlainLyricLine` / `DirectiveLine` (`{}`, green) / `CueLine` (`[]`, red)** —
  single styled rows in their natural reading direction.

The font family **must match** between the chord layer and the lyric it aligns to,
so the two share glyph metrics — that's why `CHORD_FONT === LYRIC_FONT`.

---

## Auto-fit: two calculators, one answer

Both find the `(columns, fontSize)` that maximizes font size while the whole song
fits the viewport. Both run the **same loop**: for each column count `1..8`,
binary-search the largest font that fits horizontally *and* vertically; keep the
column count whose best font is strictly largest (ties → fewest columns). They
exist as a **pair on purpose**: the offscreen one is ground truth, the analytic
one is the fast version that must agree with it.

### `useAutoFitOffscreen` (hook) — ground truth, async

Renders the **real** `ChordSheet` into a hidden offscreen container at each
candidate, waits for its async chord placement to **settle** (the chords place in
a second layout pass via `ResizeObserver`, so a fixed frame count races it — we
poll until `scrollHeight` is stable for two frames), then reads the sheet's
geometry to decide fit:

- **vertical** — `sheet.scrollHeight <= viewport.height`
- **all columns fit** — `sheet.scrollWidth <= viewport.width`
- **no lyric wraps** — a wrapped pre-wrap row grows in *height* (>1.6 line-heights)
- **no chord collides** — an absolutely-positioned chord may sit a little past its
  column's reading edge (it lands in the empty column gap) and only truly collides
  once it crosses **more than one gap** past the wrapper edge.

Accurate but expensive (dozens of hidden renders, a couple of frames each) — fine
for the playground / verification, not for every keystroke. Loads fonts once up
front so early probes don't measure narrow fallback glyphs.

### `autoFitAnalytic.ts` (`computeAutoFit`) — fast, no DOM

Predicts the same fit **without rendering anything**:

- **width** via a reusable offscreen **Canvas 2D** `measureText` (the only
  reliable way to get proportional/Hebrew line widths — a char-count formula is
  hopeless for variable-width glyphs). Measured once at `REF_PX = 100`; width is
  linear in px so any candidate size is a multiply.
- **height** is purely analytic — each line type contributes a fixed em multiple
  (`LINE_HEIGHT_EM`, **hand-kept in sync** with the inline styles in
  `ChordSheet.tsx`).
- **chord overhang** reuses `chordPlacement` on canvas-measured glyphs
  (`chordOverhangPx`) so it predicts per-chord overhang exactly the way the
  renderer draws it — catching a single chord token pushed past the lyric's far
  edge that an analytic row-width can't see.
- **column balancing** (`tallestColumnPx`) solves the CSS `column-fill: balance`
  partition exactly by binary-searching the tallest-column height (minimise the
  maximum contiguous segment) — greedy first-fit overshot.

`useAutoFitAnalytic` is the thin React-hook wrapper around `computeAutoFit`
(a `useMemo` that also recomputes once `document.fonts` is ready).

The two calculators are tuned to flip at the same boundaries: shared `TOL`/
`HFIT_PX = 2` px slack, the same "overhang > gap" chord rule, the same
columns-loop. When they disagree, the offscreen hook is right and the analytic
one is the bug.

---

## PlaygroundView.tsx — the dev harness

Routed at `/tools/playground` (not room-scoped). All state lives in the **URL**
query string so a layout is shareable/reloadable:

| param     | meaning                                    |
|-----------|--------------------------------------------|
| `song`    | song id to fetch (`songsApi.getLyrics`)    |
| `font`    | `proportional` \| `mono`                   |
| `size`    | lyric font size px                         |
| `cols`    | column count                               |
| `overlap` | `1` = draw the debug overlap overlay       |

Layout: a sticky controls sidebar + a `<main>` that is the **"one screen"** the
song must fit into. `<main>` is bounded to the viewport height on purpose — an
auto-height main would make "fits vertically" trivially true at any font size, so
auto-fit needs a real finite box (measured via `ResizeObserver` into `viewport`).

Controls:

- **song picker** + quick-switch buttons for the RTL/LTR test songs
  (`2000598, 4000137, 1000366` — both directions and the tricky alignment cases;
  see project memory / SPEC). Titles are fetched once for nicer labels.
- **font** toggle, **size**/**columns** steppers.
- **auto-fit (run once)** — `math` calls `computeAutoFit` (the analytic engine)
  synchronously; `offscreen` flips `useAutoFitOffscreen` on for a single run,
  captures its result into `size`/`cols`, then turns it off. Running both and
  comparing is how the analytic model is validated.
- **show overlap** — a debug overlay that draws one red box per chord/lyric row,
  measured to enclose the **full combo** (lyric + any overhanging chord spans).
  Because chords are absolutely positioned, a plain CSS outline on the row wrapper
  would miss overhangs — so it unions each row's rect with its chord spans'. It
  re-measures on any layout change (size/cols/font re-render the sheet and its
  chords place asynchronously) via a `ResizeObserver` + settle frame.

---

## Data flow, end to end

```
song id ──getLyrics──> ParsedSong ──renderLines──> per-line components
                                          │
                          ChordLyricLine: measure glyphs (visual order)
                                          │
                          deriveContext ──> placeChords(font, dir)  ← chordPlacement
                                          │
                          absolutely-position chord spans over lyric

auto-fit:  ParsedSong + viewport ──> computeAutoFit / useAutoFitOffscreen
                                          │  (both call chordPlacement)
                                          └─> { fontSize, columns }
```

## When you touch this code

- **Changing placement math?** Edit `chordPlacement.ts` only — the renderer and
  both calculators follow automatically. Verify against all three test songs
  (RTL long-chord-line, LTR indented lyrics).
- **Changing the renderer's line styles/margins?** Update `LINE_HEIGHT_EM` in
  `autoFitAnalytic.ts` to match, or the analytic calculator's height drifts.
- **Validating auto-fit?** Run `math` and `offscreen` in the playground for the
  same song/viewport and confirm they agree; the offscreen result is ground truth.

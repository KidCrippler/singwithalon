# Chord Mode Rendering Algorithm

## Overview

When a song is displayed in "chords mode," the system must solve two problems simultaneously:

1. **Chord Positioning** — Place each chord name (e.g., `Em`, `C`, `G`) directly above the syllable it belongs to
2. **Optimal Layout** — Choose the best combination of columns and font size so the entire song fills the screen at the largest readable size

These are handled by two independent systems that work together.

---

## Part 1: Chord Positioning (How Chords Appear Above Syllables)

### The Source Data

A song file stores chords and lyrics as alternating plain-text lines:

```
     Em            D      C
אני למעלה עכשיו, הפסקתי ליפול
```

The chord line and lyric line have the **same character width** (monospace-aligned in the source file). Each chord's starting character position tells you which lyric character it belongs above. In this example:
- `Em` starts at position 5 → it goes above the 5th character of the lyric
- `D` starts at position 19 → above the 19th character
- `C` starts at position 25 → above the 25th character

### The Backend Processing (RTL Reversal)

For Hebrew (RTL) songs, the backend reverses each chord line character-by-character before sending it to the client. This reversal exists for the **old monospace rendering** which uses CSS `unicode-bidi: bidi-override` to force left-to-right display of a reversed string.

For the **new proportional font rendering**, the frontend must undo this reversal to recover the original character positions.

### The Frontend Rendering (Anchor-Based Positioning)

Instead of relying on monospace character alignment, we use **CSS absolute positioning** to float each chord above its anchor character:

**Step 1 — Un-reverse the chord line** (RTL only):
- Reverse each non-space token character-by-character
- Then reverse the entire string
- This recovers the original source positions

**Step 2 — Parse chord positions:**
- Walk the chord string left-to-right
- Each non-space sequence is a chord; its starting index is its "position"
- Result: `[{chord: "Em", position: 5}, {chord: "D", position: 19}, {chord: "C", position: 25}]`

**Step 3 — Adjust for leading whitespace:**
- The lyric line often has leading spaces (for monospace alignment)
- We trim those leading spaces and subtract them from each chord position
- Any chord whose adjusted position < 0 gets clamped to 0

**Step 4 — Pad the lyric if chords extend beyond it:**
- If the last chord's position exceeds the trimmed lyric length, we pad the lyric with spaces
- This ensures every chord has a character to anchor above

**Step 5 — Build the HTML:**
For each chord, we split the lyric text into segments:

```html
<div class="chord-lyric-combined">
  <span>אני למעלה </span>
  <span class="chord-anchor">
    ע              ← the anchor character
    <span class="chord-label">Em</span>  ← floats above via CSS
  </span>
  <span>כשיו, הפסקתי </span>
  <span class="chord-anchor">
    ל
    <span class="chord-label">D</span>
  </span>
  <span>יפול</span>
</div>
```

**Step 6 — CSS does the visual work:**
- `.chord-anchor` has `position: relative` (establishes positioning context)
- `.chord-label` has `position: absolute; bottom: 0.95em` (floats the chord above the character)
- For RTL: `right: 0` aligns the chord to the right edge of the anchor character
- For LTR: `left: 0` aligns to the left edge
- `direction: ltr` on the chord label ensures chord names like `C#m` always render left-to-right

**Result:** Chords appear directly above the correct syllable regardless of font width, because they're absolutely positioned relative to the specific character they belong to.

### Standalone Chord Lines

When a chord line has no lyric below it (e.g., intro patterns like `Em D C`), it renders as a traditional monospace line using the old approach: `white-space: pre` with a monospace font (Cousine), right-aligned for RTL.

---

## Part 2: Column & Font Size Selection (How the Song Fills the Screen)

### The Goal

Maximize font size while ensuring **all** content is visible without scrolling. The entire song must fit on one screen — this is critical for live performance where the musician can't scroll.

### The Container

The song content lives inside a `<div>` with CSS multi-column layout. The browser handles column-breaking automatically — when content overflows one column vertically, it flows into the next column.

Key CSS properties:
- `column-count: N` — how many columns to create
- `column-gap: 0.7rem` — spacing between columns
- `overflow: hidden` — no scrolling allowed

### The Algorithm

The algorithm runs a **nested search**: for each possible column count, it finds the largest font size that fits. Then it picks the column count that yielded the largest font.

```
bestFont = 6px
bestColumns = 1

for columns = 8 down to 1:
    set container to N columns
    calculate single column width = (container_width - padding - gaps) / N
    
    binary search for largest font size (6px to 80px) that fits:
        set font size to candidate
        force browser reflow
        
        check 3 constraints:
            1. fitsVertically:  scrollHeight <= container height
            2. fitsHorizontally: no text line wider than column width
            3. fitsAllColumns:  scrollWidth <= container width
        
        if all 3 pass → try larger font
        if any fails  → try smaller font
    
    if best font for this column count > bestFont:
        bestFont = this font size
        bestColumns = this column count

apply bestColumns and bestFont to the container
```

### The Three Fitness Checks

1. **Vertical fit** (`scrollHeight <= availableHeight + 5px`):
   Does the content height exceed the container? If yes, the font is too big — content would overflow below the screen. The `+ 5px` tolerance prevents sub-pixel rounding issues.

2. **Horizontal fit** (per-element width check):
   The algorithm queries every `.lyric`, `.cue`, `.chords`, and `.chord-lyric-combined` element and measures its rendered width. If any single element is wider than the column width, the font is too big — that line would clip or wrap.

3. **All-columns-visible** (`scrollWidth <= availableWidth + 5px`):
   CSS columns can generate more columns than requested if content doesn't fit vertically. When this happens, extra columns extend horizontally beyond the container. `scrollWidth > clientWidth` detects this invisible overflow.

### Column Breaking

The algorithm does **not** manually decide where to break columns. CSS handles this automatically:
- Content flows top-to-bottom in column 1 until it reaches the container's height
- Then it continues at the top of column 2, and so on
- `break-inside: avoid` on `.lyrics-section` keeps song sections (verse, chorus) together in one column when possible

### When Does Recalculation Happen?

The algorithm re-runs when:
- A new song is loaded
- The window is resized
- Fullscreen mode is toggled
- Display mode changes (chords vs. lyrics)
- Verse navigation changes (in admin view)

It runs after a 50ms debounce to avoid layout thrashing.

---

## Part 3: The Proportional Font Advantage

### Why Proportional Fonts Allow Bigger Text

In the old monospace approach, every character (including Hebrew) occupied the same width. Hebrew monospace characters are notably wide — a line of 30 Hebrew characters in Cousine (monospace) is physically wider than the same 30 characters in Assistant (proportional).

Since the horizontal-fit check limits font size based on the widest line, narrower characters mean the same text fits at a larger font size. In practice, this yields **20-40% larger fonts** for Hebrew songs.

### The Trade-off

With proportional fonts, chord positions can't be maintained by character-counting alone (since characters have different widths). That's why we use the anchor-based absolute-positioning approach — it works regardless of character width because the chord is physically attached to its specific character in the DOM.

---

## Part 4: Data Flow Summary

```
┌─────────────────────────────────────────────────────────┐
│ Song Source File (Git)                                    │
│  "     Em            D      C"                           │
│  "אני למעלה עכשיו, הפסקתי ליפול"                          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ Backend (songs.ts)                                       │
│  • Detects chord lines (regex)                           │
│  • For RTL: reverses chord line for bidi-override        │
│  • Sends JSON: {type:"chords", text:"C..D..mE.."}       │
│                 {type:"lyric",  text:"אני למעלה..."}      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend — ChordLyricLine Component                      │
│  1. Un-reverse chord line (RTL only)                     │
│  2. Apply transposition (shift chord names by N semis)   │
│  3. Parse chord positions from character indices         │
│  4. Trim leading spaces, adjust positions                │
│  5. Build anchor-based HTML                              │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ Frontend — useDynamicFontSize Hook                        │
│  • For each column count (8→1), binary-search font size  │
│  • Pick the combo that yields the largest readable font  │
│  • Apply to container                                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│ Browser Rendering                                        │
│  • CSS multi-column splits content into N columns        │
│  • Proportional font (Assistant) renders lyrics          │
│  • Absolute-positioned chords float above anchors        │
│  • Entire song visible on one screen, no scrolling       │
└─────────────────────────────────────────────────────────┘
```

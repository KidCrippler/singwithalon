# Token-Based Chord Alignment Implementation Plan

## Overview

This document specifies the implementation of token-based chord alignment using the **ChordSheetJS** library, enabling proportional fonts for lyrics while maintaining accurate chord-to-syllable positioning.

**Goal:** Allow proportional fonts for lyrics AND chords while keeping chords positioned above their correct syllables.

**Non-Goal:** We are NOT adopting ChordPro format or changing the source file format. All existing conventions remain intact.

---

## ChordSheetJS Library Integration

### Why Use ChordSheetJS

ChordSheetJS is a mature, tested JavaScript library for parsing chord sheets. Using it reduces our code maintenance burden and leverages battle-tested parsing logic.

**Library:** `chordsheetjs` (npm package)
**Key class:** `ChordsOverWordsParser` — parses our exact format (chords above lyrics)
**Output:** `ChordLyricsPair` objects with `chords` and `lyrics` properties

### Integration Strategy: Pre/Post-Processing

Our song format has custom conventions that ChordSheetJS may not natively understand. We handle this with pre/post-processing:

**Pre-processing (before ChordSheetJS):**
1. Strip custom tokens that might confuse the parser
2. Replace with placeholders that preserve positions

**Tokens requiring pre-processing (based on evaluation):**

| Token | Issue | Pre-processing | Status |
|-------|-------|----------------|--------|
| `[]` | Empty brackets cause parse failure | Replace with `__EMPTY__`, restore after | ❌ Required |
| `[chord]` | Bracketed chords cause parse failure | Strip brackets, restore after | ❌ Required |
| `Am!` | Accent marker (not yet tested) | Strip `!`, restore after | ⚠️ To verify |
| `--->`, `<---` | Arrow tokens (not yet tested) | Replace with placeholder chord | ⚠️ To verify |
| `(Am G) x 2` | Repeat notation (not yet tested) | Parse `x N` separately | ⚠️ To verify |
| `-` | Single hyphen separator | Works natively ✅ | No pre-processing needed |
| `/C#` | Bass-only notation | Works natively ✅ | No pre-processing needed |

**Post-processing (after ChordSheetJS):**
1. Restore original tokens from placeholders
2. Apply transposition
3. Format for display (`o` → `°`)

### Compatibility Evaluation Required

Before full implementation, we must validate ChordSheetJS against our actual song corpus. See **Phase 0: Library Evaluation**.

---

## Design Decisions

### Typography

| Element | Font | Rationale |
|---------|------|-----------|
| **Lyrics (English)** | Georgia | Readable serif, widely available |
| **Lyrics (Hebrew)** | Rubik | Designed for Hebrew, clean and modern |
| **Chords** | Proportional (same as lyrics) | Bigger and clearer to read than monospace |

### Rendering

- **Segment spacing:** No gaps between segments — rely on natural lyric spaces
- **Parsing location:** Server-side with caching (consistent with current architecture)
- **Standalone chord lines:** Always monospace (intros, interludes, outros)

---

## Current State

### How It Works Today
1. Chord lines and lyric lines are stored and rendered as separate `<div>` elements
2. Alignment relies on **monospace fonts** — character position N in the chord line aligns with character position N in the lyric line
3. The `ParsedLine` type has `type: 'chords' | 'lyric'` with raw text

### The Problem
- Monospace fonts limit typography options
- Proportional fonts break alignment because characters have variable widths
- "Am" at character 9 doesn't visually align with the 9th character of proportional lyrics

---

## Proposed Solution

### Core Concept: Chord-Lyric Segments

Instead of rendering chord and lyric lines separately, parse them into **segments** where each chord is paired with its associated lyrics:

```
Chord line:  Am       G        C
Lyric line:  Hello my friend today

Segments:
  1. { chord: "Am", lyrics: "Hello my " }
  2. { chord: "G",  lyrics: "friend " }
  3. { chord: "C",  lyrics: "today" }
```

Each segment is rendered as a **vertical unit**: chord above, lyrics below. Segments flow inline, allowing proportional fonts while maintaining chord-to-syllable relationships.

### ChordSheetJS Parsing Flow

```
1. Pre-process chord line (strip/replace custom tokens)
2. Combine chord line + lyric line
3. Pass to ChordSheetJS ChordsOverWordsParser
4. Extract ChordLyricsPair objects
5. Post-process (restore custom tokens)
6. Return segments array
```

---

## Implementation Phases

### Phase 0: Library Evaluation ✅ COMPLETE

**Goal:** Validate ChordSheetJS works with our song format before committing to the implementation.

**Test files from corpus:**
- `backend/example/page64.txt` — English song with standard chords
- `backend/example/apage247.txt` — Hebrew song with RTL
- `backend/example/apage305.txt` — Hebrew song
- `backend/example/apage331.txt` — Additional test case
- `backend/example/apage259.txt` — Additional test case
- `backend/example/apage224.txt` — Additional test case
- `backend/example/apage202.txt` — Additional test case

**Evaluation criteria:**

| Criterion | Pass/Fail |
|-----------|-----------|
| Basic chord-lyric pairing works | ✅ PASS |
| Character positions are preserved | ✅ PASS |
| Multiple chords per line handled | ✅ PASS |
| Leading lyrics (before first chord) handled | ✅ PASS |
| Trailing lyrics (after last chord) handled | ✅ PASS |
| Empty lines between sections handled | ✅ PASS |
| Hebrew lyrics with Latin chords | ✅ PASS |
| Complex chords (Bm7b5, C#m7b5, Fmaj7) | ✅ PASS |
| Bass-only notation (/C#) | ✅ PASS |

**Custom tokens tested:**

| Token | Test Case | Result | Notes |
|-------|-----------|--------|-------|
| `Am!` | Accent markers | ⚠️ NOT TESTED | Not present in test files |
| `--->` | Right arrow | ⚠️ NOT TESTED | Not present in test files |
| `<---` | Left arrow | ⚠️ NOT TESTED | Not present in test files |
| `[]` | Empty placeholder | ❌ NEEDS PRE-PROCESSING | ChordSheetJS fails to parse line |
| `[Am]` | Bracketed chord | ❌ NEEDS PRE-PROCESSING | ChordSheetJS fails to parse line |
| `[/A]` | Bracketed bass-only | ⚠️ NOT TESTED | Not present in test files |
| `/F` | Bass-only notation | ✅ WORKS | Parsed correctly as `/C#` |
| `(Am G) x 2` | Repeat notation | ⚠️ NOT TESTED | Not present in test files |
| `-` | Hyphen separator | ✅ WORKS | Parsed as separate segment (e.g., `D4 - D -`) |

**Evaluation Results Summary:**

✅ **page64.txt** (English): 78 segments created, 0 errors
✅ **apage247.txt** (Hebrew): 206 segments created, 0 errors, found `[]` and `[chord]`
✅ **apage305.txt** (Hebrew): 93 segments created, 0 errors, found `[chord]`
✅ **apage331.txt** (Hebrew): 190 segments created, 0 errors

**Tokens requiring pre/post-processing:**
1. `[]` — Empty brackets cause parsing failure
2. `[chord]` — Bracketed chords cause parsing failure (e.g., `[G7]`, `[C#m]`)

**Pre-processing strategy:**
1. Before ChordSheetJS: Replace `[]` with placeholder (e.g., `__EMPTY__`)
2. Before ChordSheetJS: Replace `[chord]` with `chord` (strip brackets)
3. After parsing: Restore original tokens in segment output

**Overall: ✅ PASS — ChordSheetJS is viable with minimal pre-processing**

---

### Phase 1: Data Model Extension

**Backend: Extend `ParsedLine` type in `backend/src/types/index.ts`**

Add new types:
- `ChordLyricSegment` — contains `chord` (string or null), `lyrics` (string), and `position` (number for debugging)
- `ParsedChordLyricLine` — new line type with `type: 'chord-lyric-pair'`, containing `segments` array, `rawChords`, `rawLyrics`, and `direction`
- `SongLine` — union type combining `ParsedLine` and `ParsedChordLyricLine`

**Key decisions:**
- Keep `rawChords` and `rawLyrics` for monospace fallback mode
- The `type: 'chord-lyric-pair'` distinguishes paired lines from standalone lines
- Standalone chord lines (no lyrics below) remain `type: 'chords'`

---

### Phase 2: Backend Parsing with ChordSheetJS

**Location:** `backend/src/routes/songs.ts` — modify `parseSongMarkup()` function

**Dependencies:** Install `chordsheetjs` npm package

**Algorithm:**

```
For each line in the song:
  1. If line is chord line AND next line is lyric line:
     - Pre-process: strip/replace custom tokens
     - For RTL songs: apply reverseChordLineForRtl() FIRST
     - Parse with ChordSheetJS ChordsOverWordsParser
     - Post-process: restore custom tokens
     - Emit { type: 'chord-lyric-pair', segments, rawChords, rawLyrics }
     - Skip the next line (already consumed)
  
  2. If line is chord line AND next line is NOT lyric line:
     - Emit { type: 'chords', text: line } (standalone chord line)
  
  3. If line is lyric line (not consumed by previous chord line):
     - Emit { type: 'lyric', text: line }
  
  4. All other line types (directive, cue, empty):
     - Emit as-is with existing logic
```

**New helper functions to add:**
- `preProcessChordLine(line)` — replaces custom tokens with placeholders
- `postProcessSegments(segments, originalLine)` — restores custom tokens
- `parseWithChordSheetJS(chordLine, lyricLine)` — wraps library call

---

### Phase 3: RTL (Hebrew) Support

**Status: IMPLEMENTED with ChordSheetJS**

ChordSheetJS's column-based segment structure + CSS flexbox with `flex-direction: row-reverse` provides proper RTL support.

**How it works:**
1. ChordSheetJS parses chord+lyric lines into segment pairs
2. Each segment is a self-contained column (chord above, lyrics below)
3. For RTL: `flex-direction: row-reverse` flows segments right-to-left
4. Hebrew text within each segment displays naturally RTL

**Note:** The `reverseChordLineForRtl()` function is still used for the monospace fallback (`rawChords`).

**Current RTL flow (unchanged):**
1. Strip directional control characters
2. Reverse entire chord line string
3. Reverse each token back to restore chord names
4. Swap bracket types for unbalanced brackets
5. Flip arrow directions (`--->` → `<---`)

**New RTL flow for token-based:**
1. Apply `reverseChordLineForRtl()` to chord line (existing algorithm)
2. Pre-process the reversed chord line
3. Parse with ChordSheetJS
4. Post-process segments
5. Frontend renders with `direction: rtl` and `flex-direction: row-reverse`

**Example:**

```
Original (source file):
Chord line: "Am       G        C"
Lyric line: "שלום לכולם היום"

After RTL reversal:
Chord line: "C        G       Am"

Segments (parsed after reversal):
  1. { chord: "C",  lyrics: "שלום לכ" }
  2. { chord: "G",  lyrics: "ולם הי" }
  3. { chord: "Am", lyrics: "ום" }

Frontend renders RTL:
  [Am/ום] [G/ולם הי] [C/שלום לכ]  ← flows right-to-left
```

---

### Phase 4: Frontend Rendering

**New component:** `ChordLyricPairLine.tsx` in `frontend/src/components/song/`

**Props:**
- `segments` — array of `ChordLyricSegment`
- `direction` — `'ltr' | 'rtl'`
- `keyOffset` — for transposition

**Rendering approach:**
- Container uses flexbox with `flex-direction: row` (LTR) or `row-reverse` (RTL)
- Each segment is an inline-flex column: chord on top, lyrics below
- **Both chords and lyrics use proportional fonts** (Georgia for English, Rubik for Hebrew)
- Spaces within lyrics preserved via `white-space: pre`

**Integration points:**
- `PlayingNowView.tsx` — modify `LineDisplay` component to handle `chord-lyric-pair` type
- `SongView.tsx` — same modification for single song view

---

### Phase 5: Admin Toggle for Monospace Fallback

**New admin control:** "Use proportional fonts" toggle

**State management:**
- Add `useProportionalFonts` boolean to `PlayingState` in database
- Add to `GET /api/state` response
- New endpoint: `POST /api/state/font-mode`
- New socket event: `font-mode:changed`
- Default value: `false` (monospace, current behavior)

**Database change:**
- Add column `use_proportional_fonts` (INTEGER, default 0) to `playing_state` table

**Frontend behavior:**
- When `useProportionalFonts = false`: Render using current monospace approach (use `rawChords` and `rawLyrics`)
- When `useProportionalFonts = true`: Render using token-based segments with proportional fonts

**Admin UI:**
- New toggle button in admin controls overlay
- Icon suggestion: 🔤 or similar
- Tooltip: "Toggle proportional fonts for lyrics"

---

### Phase 6: Standalone Chord Lines

**Rule:** Chord lines without an associated lyric line below remain monospace.

**Examples of standalone chord lines:**
- Intro: `D   G/D   A/D   G/D`
- Interlude: `Am   Dm   G    C`
- Outro/ending chord: `D`

**Detection logic:**
A chord line is standalone if:
- Next line is empty, OR
- Next line is another chord line, OR
- Next line is a directive/cue, OR
- It's the last line of the song

**Rendering:**
- Standalone chord lines use existing `type: 'chords'` representation
- Always rendered with monospace font
- No ChordSheetJS parsing needed

---

### Phase 7: Preserve Existing Conventions

All existing notation conventions MUST continue to work:

| Notation | Treatment in Token-Based Mode |
|----------|-------------------------------|
| `{...}` directives | Unchanged — separate line, not paired |
| `[...]` cues | If on lyric line: included in lyrics segment |
| `[Am]` bracketed chords | Pre-process → parse → post-process |
| `[]` empty placeholder | Pre-process → parse → post-process |
| `(Cm Ab) x 2` | Pre-process → parse → post-process |
| `--->`, `<---` | Pre-process → parse → post-process |
| `-` separator | Pre-process → parse → post-process |
| `Am!` accent marker | Pre-process → parse → post-process |

**Validation:** The existing `isChordToken()` and `isChordLine()` functions in `backend/src/routes/songs.ts` remain the source of truth for chord detection (used before ChordSheetJS parsing).

---

### Phase 8: Transposition Integration

**Requirement:** Transposition must work on individual chord tokens within segments.

**Approach:**
- Use existing `transposeChord()` function from `frontend/src/services/transpose.ts`
- Apply to each segment's chord individually during rendering
- Use `formatChordLineForDisplay()` for `o` → `°` conversion

**Special handling for compound tokens:**
- `(Am)` → transpose inner, preserve parens
- `[Am]` → transpose inner, preserve brackets
- `Am!` → transpose, preserve exclamation

The existing `transposeToken()` function already handles these cases.

---

## API Changes Summary

### New/Modified Endpoints

| Endpoint | Change |
|----------|--------|
| `GET /api/songs/:id/lyrics` | Response includes `chord-lyric-pair` line types with segments |
| `GET /api/state` | Response includes `useProportionalFonts` |
| `POST /api/state/font-mode` | NEW: Set proportional fonts mode |

### New Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `font-mode:changed` | Server → Client | `{ useProportionalFonts: boolean }` |

---

## Migration Path

### Backward Compatibility

1. **Phase 0-1:** Evaluation and data model — no runtime changes
2. **Phase 2-3:** Backend changes are additive
   - New `chord-lyric-pair` type added alongside existing types
   - Existing line types unchanged
   - `rawChords` and `rawLyrics` always included for fallback
3. **Phase 4-5:** Frontend changes are opt-in
   - Default `useProportionalFonts = false` means current rendering
   - Admin must explicitly enable proportional mode
4. **Phase 6+:** Gradual rollout
   - Test with English songs first
   - Validate Hebrew rendering
   - Eventually make proportional fonts the default

### Rollback Plan

If issues arise:
1. Set `useProportionalFonts = false` globally
2. Frontend falls back to monospace rendering using `rawChords`/`rawLyrics`
3. No data migration needed — source files unchanged

---

## Testing Checklist

### English Songs
- [ ] Simple chord line + lyric line pairing
- [ ] Chord at start of line
- [ ] Chord mid-word (syllable split)
- [ ] Multiple chords per line
- [ ] Leading lyrics before first chord
- [ ] Trailing lyrics after last chord
- [ ] Standalone chord lines (intro/outro)
- [ ] Transposition preserves segment structure

### Hebrew Songs
- [ ] RTL reversal applied before parsing
- [ ] Segments render right-to-left
- [ ] Hebrew lyrics with Latin chords
- [ ] Syllable splits work with Hebrew characters
- [ ] Transposition works correctly

### Edge Cases
- [ ] Empty brackets `[]` in chord line
- [ ] Parenthesized progressions `(Am G) x 2`
- [ ] Arrow tokens `--->`, `<---`
- [ ] Bass-only notation `/F`, `[/A]`
- [ ] Bracketed chords `[Am]`
- [ ] Accent markers `Am!`
- [ ] Very long chord lines (many segments)
- [ ] Very short segments (single character lyrics)

### Mode Switching
- [ ] Admin toggle updates all viewers
- [ ] Fallback to monospace works correctly
- [ ] Mode persists across page refresh
- [ ] New viewers receive current mode

---

## Timeline Estimate

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 0: Library Evaluation | 3 hours | None |
| Phase 1: Data Model | 2 hours | Phase 0 |
| Phase 2: Backend Parsing | 4 hours | Phase 1 |
| Phase 3: RTL Support | 3 hours | Phase 2 |
| Phase 4: Frontend Rendering | 4 hours | Phase 2 |
| Phase 5: Admin Toggle | 2 hours | Phase 4 |
| Phase 6: Standalone Lines | 1 hour | Phase 2 |
| Phase 7: Convention Preservation | 2 hours | Phase 2 |
| Phase 8: Transposition | 2 hours | Phase 4 |
| Testing & Polish | 4 hours | All phases |

**Total estimated effort:** ~27 hours

---

## Appendix: Visual Examples

### English Song (Proportional Mode)

```
┌──────────────────────────────────────────────────────────────┐
│  D              Gmaj7      A/C#           F#m                │
│  It's a little bit funny   this feeling inside               │
│                                                              │
│  Bm             Bm/A       Bm/G#      G                      │
│  I'm not one of those who can   easily hide                  │
└──────────────────────────────────────────────────────────────┘
```

### Hebrew Song (Proportional Mode, RTL)

```
┌──────────────────────────────────────────────────────────────┐
│                               Am/F     Am       Am9          │
│                         היבשת את בסערה כבשת איך              │
│                                                              │
│                               Am       E7       Dm7          │
│                            אישה כל של החלומות נסיך           │
└──────────────────────────────────────────────────────────────┘
```

### Standalone Chord Line (Always Monospace)

```
┌──────────────────────────────────────────────────────────────┐
│  {Piano Intro}                                               │
│  D   G/D   A/D   G/D                    ← monospace          │
│                                                              │
│  D              Gmaj7      A/C#                              │
│  It's a little bit funny   this feeling    ← proportional    │
└──────────────────────────────────────────────────────────────┘
```

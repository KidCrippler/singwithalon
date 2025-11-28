# Verse System Specification

## Overview

The verse system enables displaying songs in manageable chunks for sing-along sessions. It is **only relevant in the "Playing Now" screen** and does not affect the Presentation View (when clicking a song from search).

## Core Concepts

### Verse Calculation (Frontend Only)

Verse calculation happens entirely in the frontend. The backend only provides `linesPerVerse` (default 8, can be overridden by projector).

1. **Lines Per Verse**: Default 8 lines, configurable via projector
2. **Line Counting**: Only lyrics-visible lines count towards the line limit:
   - ✅ Counted: `lyric`, `cue`, `empty` lines
   - ❌ Not counted: `chord`, `directive` lines
3. **Verse Boundaries**: Every `linesPerVerse` visible lines constitutes a verse
4. **Chord Line Inclusion**: Chord/directive lines belong to the verse of the lyrics they precede (look-ahead). They ARE included in the verse range for highlighting.

### Example

If a song starts with 7 chord/directive lines followed by 8 lyric lines:
- Verse 1 includes all 15 lines (7 chord + 8 lyric)
- The purple highlight wraps all 15 lines
- Lyrics view shows only the 8 lyric lines

### Default State

**Verse mode is disabled by default.** Admin must explicitly enable it.

## Admin vs Viewer Displays

### Admin Display (Always Chords)

- **Admin ALWAYS sees chords** in multi-column layout with dynamic font sizing
- The display mode toggle (🎸/🎤) controls what **viewers** see, NOT what admin sees
- Admin's view never changes based on display mode or verse mode
- **Purple highlight overlay** appears ONLY when: `displayMode === 'lyrics' && versesEnabled === true`
  - This shows admin which verse viewers are currently seeing
  - Highlight is an overlay on top of existing multi-column layout
  - Does NOT change column count or layout
- **Click-to-navigate**: Admin can click anywhere within a verse's area to jump to that verse

### Viewer Display (3 Modes)

| Mode | Chords | Verses | What Viewer Sees |
|------|--------|--------|------------------|
| 1 | ✅ Enabled | (ignored) | Same as admin: multi-column chords view, no purple |
| 2 | ❌ Disabled | ❌ Disabled | Full lyrics view, all lyrics visible |
| 3 | ❌ Disabled | ✅ Enabled | Single verse visible, centered, large font |

**Key behaviors:**
- Admin toggles sync to all viewers immediately
- After sync, viewers can override settings locally
- Viewer overrides reset when song changes

## User Roles & Controls

### Admin Controls

1. **Display Mode Toggle** (🎸/🎤): Switches viewers between chords and lyrics mode
   - Does NOT affect admin's display (admin always sees chords)
2. **Verses Toggle** (📖): Enable/disable verse mode for viewers in lyrics mode
   - Only meaningful when display mode is 'lyrics'
3. **Navigate Verses**: Next/Previous buttons
   - Disabled when verses are off or at boundaries
4. **Click Navigation**: Click on any verse area to jump to it
   - Works within multi-column layout
5. **Verse Indicator** (e.g., "2/5"): Shows current verse / total verses
   - Only visible when verses are enabled

### Viewer Controls

1. **Local Override**: Viewer can override admin's toggle settings
2. **Override Resets**: When song changes, viewer override resets to admin preference
3. **No Navigation**: Viewer cannot change the current verse

## State Management

### Backend State (`playing_state` table)

```sql
verses_enabled INTEGER DEFAULT 0  -- 0 = off (default), 1 = on
current_verse_index INTEGER DEFAULT 0
display_mode TEXT DEFAULT 'lyrics'  -- 'lyrics' | 'chords'
projector_lines_per_verse INTEGER  -- From first connected projector
```

### Socket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `song:changed` | Server→Client | `{ songId, verseIndex, keyOffset, displayMode, versesEnabled }` | Includes all state |
| `verses:toggle` | Client→Server | `{}` | Admin toggles verse mode |
| `verses:toggled` | Server→Client | `{ versesEnabled }` | Broadcast when verse mode changes |
| `verse:changed` | Server→Client | `{ verseIndex }` | Broadcast when verse index changes |
| `verse:set` | Client→Server | `{ verseIndex }` | Admin sets specific verse |
| `mode:set` | Client→Server | `{ displayMode }` | Admin sets display mode |
| `mode:changed` | Server→Client | `{ displayMode }` | Broadcast when mode changes |

### Frontend State (`PlayingNowContext`)

- `versesEnabled`: Admin's preference (from server), default `false`
- `displayMode`: Admin's preference (from server), default `'lyrics'`
- `viewerVerseOverride`: Local viewer override (`null` = use admin preference)
- `viewerModeOverride`: Local viewer override for display mode
- `currentVerseIndex`: Current verse being displayed
- `linesPerVerse`: From projector or default 8
- Computed: `effectiveVersesEnabled = viewerVerseOverride ?? versesEnabled`
- Computed: `effectiveDisplayMode = viewerModeOverride ?? displayMode`

## Visual Behavior Summary

### When Does Admin See Purple Highlight?

| Display Mode | Verses Enabled | Purple Highlight |
|--------------|----------------|------------------|
| chords | ❌ | ❌ No |
| chords | ✅ | ❌ No |
| lyrics | ❌ | ❌ No |
| lyrics | ✅ | ✅ **Yes** |

Purple highlight = viewers are seeing single-verse lyrics mode.

### When Does Verse Indicator (2/5) Show?

Only when `versesEnabled === true`.

## Implementation Checklist

### Backend

- [x] Add `verses_enabled` column to `playing_state` table (DEFAULT 0)
- [x] Update `playingStateQueries.update()` to handle `verses_enabled`
- [x] Socket handler for `verses:toggle` (admin only) - toggles the value
- [x] Broadcast `verses:toggled` to all clients in `playing-now` room
- [x] Include `versesEnabled` in `song:changed` payload
- [x] Include `versesEnabled` in `GET /api/state` response
- [x] Remove `verseBreaks` calculation from song parsing (frontend handles it now)

### Frontend - State

- [x] Add `versesEnabled` to `PlayingNowContext` state
- [x] Add `viewerVerseOverride` state (resets to `null` on song change)
- [x] Add `toggleVersesEnabled()` action (admin only)
- [x] Listen for `verses:toggled` socket event
- [x] Compute `effectiveVersesEnabled`: `viewerVerseOverride ?? versesEnabled`

### Frontend - Verse Calculator (`utils/verseCalculator.ts`)

- [x] `isLyricsVisible(line)`: Returns true for `lyric`, `cue`, `empty` types
- [x] `calculateVerses(lines, linesPerVerse)`: Returns `Array<{ startIndex, endIndex, visibleLineCount }>`
- [x] Include chord/directive lines with the verse they precede (look-ahead grouping)
- [x] `getVerseLines(lines, verse, lyricsOnly)`: Helper to extract lines for a verse
- [x] `findVerseForLine(verses, lineIndex)`: Helper to find which verse a line belongs to

### Frontend - Admin Display

- [x] Admin ALWAYS sees chords in multi-column layout (no mode switching for admin)
- [x] Display mode toggle affects VIEWERS only, not admin
- [x] Purple highlight overlay when: `displayMode === 'lyrics' && versesEnabled === true`
- [x] Highlight is CSS overlay, does NOT change column layout
- [x] Click handler on lines to navigate to verse (within multi-column layout)
- [x] Verse indicator only shows when `versesEnabled === true`

### Frontend - Viewer Display

- [x] Mode 1 (chords enabled): Same as admin view, no purple, multi-column
- [x] Mode 2 (lyrics, verses off): Full lyrics view, all visible
- [x] Mode 3 (lyrics, verses on): Single verse, centered, large font, slide animation
- [x] Local override toggle for viewer (only in lyrics+verses mode)
- [x] Override resets on song change

### Frontend - Controls

- [x] Admin: Display mode toggle (affects viewers only)
- [x] Admin: Verse toggle button (shows current state)
- [x] Admin: Next/Prev verse buttons (disabled when verses off or at boundaries)
- [x] Viewer: Local override toggle (only visible when admin has lyrics+verses enabled)
- [x] Verse indicator (e.g., "2/5") - only when verses enabled

## Edge Cases

1. **Empty song**: No verses calculated, verse controls disabled
2. **Song with only chords**: No lyrics-visible lines → disable verse mode
3. **Last verse incomplete**: Show partial verse (less than `linesPerVerse` lines)
4. **Projector disconnects**: Keep last known `linesPerVerse`
5. **Admin disables verses mid-song**: Viewers return to full lyrics view
6. **Song changes**: Reset `currentVerseIndex` to 0, reset viewer overrides to `null`

## UI/UX Notes

- **Purple highlight**: `rgba(128, 0, 128, 0.1)` - overlay on existing layout
- **Animations**: 300ms ease for transitions (verse changes in lyrics mode)
- **Click targets**: Each line belongs to a verse; clicking anywhere in verse navigates
- **Font size in lyrics view (mode 3)**: Maximized to fit verse, feels "big" for distance
- **Verse indicator**: Small badge near admin controls, only when verses enabled
- **Toggle buttons**: Clear visual state (on/off)

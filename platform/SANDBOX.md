# Sandbox - Chord Sheet Sketching Tool

## Overview

A development tool for composing and previewing chord sheets in real-time. The sandbox provides a split-screen interface where you can write chord markup on one side and see the rendered preview (exactly as it would appear in the actual system) on the other side.

**Route:** `/tools/sandbox`

**Authentication:** None required (public access)

**Mobile Support:** Not supported. Mobile/tablet users see a "Not supported on mobile devices" message.

---

## Layout

### Split-Screen Design

```
┌─────────────────────────────────────────────────────────────┐
│  [🔄 Swap]  [🎸 Chords / 🎤 Lyrics]  [Transpose: ▼ 0 ▲]    │
├────────────────────────────┬────────────────────────────────┤
│                            │                                │
│      PREVIEW PANEL         │        EDITOR PANEL            │
│    (rendered output)       │      (raw text input)          │
│                            │                                │
│    - Shows song exactly    │    - Textarea for markup       │
│      as in the system      │    - Monospace font            │
│    - Supports chords and   │    - Full height               │
│      lyrics-only modes     │                                │
│                            │                                │
└────────────────────────────┴────────────────────────────────┘
```

### Default Configuration
- **Preview panel:** Left side (Hebrew/RTL default)
- **Editor panel:** Right side
- **Swap button:** Allows swapping panel positions

### Toolbar Controls
1. **Swap Button (🔄):** Toggle panel positions (left ↔ right)
2. **Display Mode Toggle:** Switch between Chords and Lyrics-only modes
3. **Transpose Controls:** `[ ▼ ] 0 [ ▲ ]` for key offset (-6 to +6)

---

## Features

### 1. Real-Time Preview

The preview panel renders the chord sheet exactly as it would appear in the actual system:

**Chords Mode:**
- White background
- Monospace font for exact chord alignment
- Blue chords, green directives `{}`, red cues `[]`
- Chord continuation arrows in blue
- Auto-shrink font to fit content

**Lyrics-Only Mode:**
- Background image with semi-transparent overlay
- Large readable font
- Chords and directives hidden
- Cues `[]` visible in red

### 2. Auto-Detection

- **RTL/LTR:** Auto-detected from text content (Hebrew characters trigger RTL)
- **Chord lines:** Automatically identified using the same regex patterns as the server
- **Metadata:** First lines parsed for title, artist, and credits

### 3. Live Sync with Debounce

- Preview updates automatically as you type
- **500ms debounce:** Changes are sent to server 500ms after typing stops
- Immediate update on paste events
- No manual "sync" button needed

### 4. Bidirectional Line Highlighting

- **Editor → Preview:** Clicking/positioning cursor in editor highlights the corresponding line in preview
- **Preview → Editor:** Clicking a line in preview moves cursor to that line in editor
- Visual highlight style matches the verse highlighting in PlayingNowView

### 5. Transposition

- Transpose controls work exactly as in the real system
- Offset range: -6 to +6 semitones
- All chord transposition logic reused from existing `transpose.ts` service

---

## Technical Implementation

### New Backend Endpoint

```
POST /api/tools/parse-markup
Content-Type: text/plain

Body: Raw chord sheet text

Response: ParsedSong JSON
{
  "metadata": {
    "title": "Song Title",
    "artist": "Artist Name", 
    "credits": "מילים: ... לחן: ...",
    "direction": "rtl" | "ltr"
  },
  "lines": [
    { "type": "chords", "text": "Am   G   C", "raw": "Am   G   C" },
    { "type": "lyric", "text": "שורת מילים" },
    { "type": "directive", "text": "Solo" },
    { "type": "cue", "text": "Hey!" },
    { "type": "empty", "text": "" }
  ]
}
```

This endpoint reuses the existing `parseSongMarkup` function from `routes/songs.ts`, avoiding any code duplication.

### New Frontend Components

```
frontend/src/
├── components/
│   └── views/
│       └── SandboxView.tsx       # Main sandbox component
├── App.tsx                       # Add /tools/sandbox route
```

### Component Structure

```tsx
SandboxView
├── Toolbar
│   ├── SwapButton
│   ├── DisplayModeToggle  
│   └── TransposeControls (reused)
├── SplitPane
│   ├── PreviewPanel
│   │   └── LyricsDisplay (logic reused from SongView/PlayingNowView)
│   └── EditorPanel
│       └── Textarea
└── MobileBlocker (shown on mobile/tablet)
```

### State Management

Local component state only (no context needed):
- `rawText: string` - Editor content
- `parsedSong: ParsedSong | null` - Parsed result from server
- `displayMode: 'chords' | 'lyrics'` - Current display mode
- `keyOffset: number` - Transpose offset
- `panelsSwapped: boolean` - Panel position toggle
- `highlightedLine: number | null` - Currently highlighted line
- `isLoading: boolean` - Parsing in progress indicator

### Debounce Implementation

```tsx
// Pseudocode
const [rawText, setRawText] = useState('');
const [parsedSong, setParsedSong] = useState(null);

// Debounced parse function
const debouncedParse = useDebouncedCallback(async (text: string) => {
  if (!text.trim()) {
    setParsedSong(null);
    return;
  }
  const result = await fetch('/api/tools/parse-markup', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: text,
  }).then(r => r.json());
  setParsedSong(result);
}, 500);

// On text change
const handleTextChange = (newText: string) => {
  setRawText(newText);
  debouncedParse(newText);
};
```

### Line Highlighting Logic

**Editor → Preview mapping:**
1. On cursor position change in textarea, calculate current line number
2. Map editor line number to parsed line index (accounting for metadata lines at top)
3. Highlight corresponding line in preview

**Preview → Editor mapping:**
1. Each preview line has a `data-line-index` attribute
2. On click, extract line index and calculate textarea cursor position
3. Focus textarea and set selection to start of that line

### Mobile Detection

```tsx
const isMobileOrTablet = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/.test(userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
};
```

---

## UI/UX Details

### Empty State
- Editor shows placeholder text: "הדבק כאן את השיר..." (Paste your song here...)
- Preview shows message: "התחל לכתוב כדי לראות תצוגה מקדימה" (Start typing to see preview)

### Loading State
- Small spinner in preview panel while parsing
- Editor remains fully interactive during parsing

### Error Handling
- If parsing fails, show error message in preview panel
- Editor content is never lost

### Styling
- Reuse existing CSS classes from SongView/PlayingNowView
- Toolbar matches app header styling
- Split pane has subtle border/shadow between panels
- Resize handle between panels (optional enhancement)

---

## File Changes Summary

### Backend
1. `backend/src/routes/songs.ts` - Add new endpoint or create separate tools route file

### Frontend  
1. `frontend/src/App.tsx` - Add `/tools/sandbox` route
2. `frontend/src/components/views/SandboxView.tsx` - New component (main implementation)
3. `frontend/src/components/views/SandboxView.css` - Styles for sandbox

---

## Out of Scope (V1)

- Save/export functionality
- Template/example songs
- Validation warnings for unrecognized chord tokens
- URL state for sharing
- Font size adjustment
- Key offset persistence (localStorage)
- Verse calculation/display
- Mobile/tablet support

---

## Testing Checklist

- [ ] Preview renders exactly as in SongView (chords mode)
- [ ] Preview renders exactly as in PlayingNowView lyrics mode
- [ ] RTL detection works for Hebrew songs
- [ ] LTR detection works for English songs
- [ ] Transposition works correctly
- [ ] Debounce prevents excessive API calls during typing
- [ ] Line highlighting works editor → preview
- [ ] Line highlighting works preview → editor
- [ ] Panel swap works correctly
- [ ] Display mode toggle works
- [ ] Mobile devices see blocking message
- [ ] Empty state displays correctly
- [ ] Large songs render without performance issues


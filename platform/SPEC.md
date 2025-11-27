# SingWithAlon - Sing-Along Web Application Specification

## 1. Overview

A real-time web application for managing sing-along events and band performances. The app displays song lyrics and chords, supports live synchronization across multiple viewers, and enables audience participation through a song request queue.

### Core Concepts
- **Admin**: Controls which song is playing, manages the queue, advances verses
- **Viewer**: Watches the current song, can request songs from the catalog
- **Projector**: A special viewer type that displays lyrics for a crowd; its resolution determines verse boundaries

### Language Support
- **Primary**: Hebrew (RTL) - ~85% of songs
- **Secondary**: English (LTR)
- Auto-detection based on Unicode character analysis with optional JSON override
- **Version 1 does NOT support mixed-language content within a single song**

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Fastify |
| Frontend | React + Vite |
| Real-time | Socket.io |
| Database | SQLite (for queue, session, playing-now state) |
| Song Storage | JSON index file + text files (lyrics/chords) stored externally, fetched via URL |

---

## 3. User Roles & Authentication

### 3.1 URL Structure

| URL | Purpose | Auth Required |
|-----|---------|---------------|
| `http://mydomain.com/` | Viewer entry point | No |
| `http://mydomain.com/admin` | Admin/Projector entry point | No (initially) |

**Viewer URL (`/`):**
- Goes directly to Search View
- No login option visible
- Full viewer functionality (search, view songs, add to queue, watch Playing Now)

**Admin URL (`/admin`):**
- Initially looks and functions exactly like viewer
- Has a visible "Login" button/option
- After successful login:
  - Page refreshes/updates
  - Admin permissions granted
  - Queue tab becomes visible
  - Private songs become visible
  - "Present Now" buttons appear on songs
  - Admin controls appear on Playing Now view

### 3.2 Admin
- **Authentication**: Username + password → stored as HTTP-only cookie
- **Capabilities** (after login):
  - View all songs (including private)
  - Search and present any song
  - Control "Playing Now" (change song, advance verses, set key/transpose)
  - Manage queue (view, present from queue)
  - Toggle between lyrics-only and lyrics+chords modes
- **Projector Mode**: Admin can toggle "This is a projector" during/after login
  - Checkbox during login OR button in UI after login
  - First projector to connect sets the resolution for verse calculation
  - Subsequent projectors receive the same verse boundaries (may display incorrectly if different resolution)

### 3.3 Viewer (Anonymous)
- **No authentication required**
- **Capabilities**:
  - Browse and search public songs
  - View any public song's lyrics/chords
  - Add songs to the queue (with their name)
  - Watch "Playing Now" screen
  - Toggle personal preferences:
    - Lyrics-only vs Lyrics+chords
    - Verse mode vs Full-song mode
    - Override transposition (with sync-to-admin button)
  - View and cancel their own queue requests

---

## 4. Views / Screens

### 4.1 Search View
- **Purpose**: Browse and find songs
- **Components**:
  - Text search box (filters by song name AND artist simultaneously)
  - List of songs (name, artist, optional category badges)
  - Private songs: visible to admin only
- **Actions**:
  - Click song → go to Presentation View (that song)
  - Viewer can click "Add to Queue" (prompts for name, shows confirmation)
  - Admin can click "Present Now" (immediately goes to Playing Now)
- **RTL Layout**: Default is RTL; song list displays right-to-left
- **Responsive Layout**: Song list uses multi-column grid that adapts to screen width:
  - Mobile (<640px): 1 column
  - Small screens (640px+): 2 columns
  - Medium screens (1024px+): 3 columns
  - Large screens (1400px+): 4 columns
  - Extra-large screens (1800px+): 5 columns

### 4.2 Presentation View (Single Song)
- **Purpose**: Display one song's lyrics and optionally chords
- **Two Display Modes**:

#### 4.2.1 Lyrics + Chords Mode (Band Mode)
- **Styling**:
  - White background
  - Black lyrics (monospace font for exact spacing preservation)
  - Blue chords (positioned above lyrics per source file spacing)
  - Green band directives `{...}` (italic)
  - Red crowd cues `[...]`
  - Chord continuations `--->` shown in blue
- **Layout**: Single-screen, auto-shrink font to fit all content
- **Transposition controls**: Visible, allows key change

#### 4.2.2 Lyrics Only Mode (Crowd/Projection Mode)
- **Styling**:
  - Background: Random image from bundled collection with semi-transparent dark overlay
  - Text: High-contrast (light/yellow text on dark semi-transparent boxes per line)
  - Song title, artist, composers/lyricists displayed at top header bar
- **Verse Mode** (default for projectors):
  - Only current verse visible
  - Admin controls which verse is highlighted
- **Full-Song Mode** (viewer toggle):
  - All lyrics visible, scrollable
- **Transposition controls**: Visible in chords mode only
- **Hidden elements**: Band directives `{}`, continuation markers `--->`
- **Visible elements**: Crowd cues `[]` in red

#### Common Features
- **Transposition**:
  - Admin sets global key
  - Viewers can override locally
  - "Sync to admin" button resets viewer's override
  - Visual indicator when viewer is out of sync with admin
- **RTL Support**:
  - Auto-detected via Hebrew Unicode characters (`\u0590-\u05FF`)
  - Chords remain LTR but positioned according to source file spacing
  - Entire layout flips for RTL songs

### 4.3 Playing Now View
- **Purpose**: Live, synchronized song display for everyone
- **Behavior**:
  - WebSocket-connected to server
  - When admin changes song, all connected viewers see new song
  - When admin advances verse, all viewers in verse-mode see update
  - 500ms latency tolerance is acceptable
- **Initial State** (no song playing):
  - Display custom splash screen with logo + QR code (admin-provided image asset)
- **Viewer Controls** (visible to all):
  - Toggle: Lyrics-only ↔ Lyrics+chords
  - Toggle: Verse mode ↔ Full-song mode (non-projectors only)
  - Transposition override (if in chords mode) with sync button
- **Admin Controls** (small overlay, top-left corner, non-intrusive):
  - Previous verse button
  - Next verse button
  - Toggle display mode (lyrics-only ↔ lyrics+chords)
  - Toggle chord visibility
  - Key/transpose controls (visible in chords mode)
- **Keyboard Shortcuts** (critical for Bluetooth pedal support):
  - Arrow keys (Up/Down or Left/Right) mapped to verse navigation
  - **Must work even when admin is on other tabs (Queue, Search)**

### 4.4 Queue View (Admin Only)
- **Purpose**: Manage song requests from viewers
- **Display**:
  - Grouped by requester (name + session ID combination)
  - Groups sorted by first request timestamp (earliest first)
  - Within each group: FIFO order
  - Clear visual separation between groups with requester name as group header
- **Song Entry Display**:
  - Song name + artist
  - "Present" button
  - Visual state: pending (normal) / played (grayed out, at bottom of group)
- **Behavior on "Present"**:
  - Song goes to "Playing Now" immediately
  - Queue entry marked as "played" (grayed, moves to bottom of its group)
  - **Entire group moves to bottom of the overall queue** (fairness mechanism to prevent starvation)
- **Limits**:
  - Max 25 songs per viewer in queue

### 4.5 Admin Navigation
- **Tab Bar** at top of screen with 3 tabs:
  - Search
  - Playing Now
  - Queue
- All tabs accessible at any time
- **Keyboard shortcuts for verse navigation work across ALL tabs**
- **"Reload Songs" button** (in header or settings): Re-fetches songs.json from Git URL, updates song list

### 4.6 Frontend Routing (SPA)

| Route | View | Notes |
|-------|------|-------|
| `/` | Search View | Viewer entry point |
| `/admin` | Search View | Admin entry point (same view, login option visible) |
| `/song/:id` | Presentation View | View single song |
| `/playing-now` | Playing Now View | Live synchronized view |
| `/queue` | Queue View | Admin only (redirects to `/admin` if not logged in) |

**Behavior:**
- `/` and `/admin` render the same Search View component
- The difference is contextual: `/admin` shows login button, `/` doesn't
- After admin login on `/admin`, all routes gain admin capabilities
- Direct navigation to `/queue` by non-admin redirects to `/admin`

---

## 5. Data Model

### 5.1 Song Index (JSON file stored in Git, fetched by app)

```json
{
  "id": 4000169,
  "name": "50 Ways To Say Goodbye",
  "singer": "Train",
  "composers": ["Bjorklund Amund", "Lind Espen"],
  "lyricists": ["Bjorklund Amund", "Lind Espen"],
  "isPrivate": true,
  "playback": {
    "youTubeVideoId": "GSBFehvLJDc"
  },
  "categoryIds": ["2", "5"],
  "lyrics": {
    "markupUrl": "https://raw.githubusercontent.com/KidCrippler/songs/master/english_alon/page169.txt"
  },
  "direction": "ltr",
  "dateCreated": 1607299200000,
  "dateModified": 1607299200000
}
```

**Notes:**
- `isPrivate`: If true, song is hidden from viewers but admin can still present it
- `direction`: Optional override for text direction ("ltr" or "rtl"), otherwise auto-detect
- `playback.youTubeVideoId`: For reference only, not used in v1

### 5.2 Song Markup File Format

#### Example English Song:
```
50 Ways To Say Goodbye - Train
Lyrics and Music: Bjorklund Amund, Lind Espen

{Brass and Guitar}
Am   Dm   G    C
F    Dm   E7   E7

{Rest Join}
Am             Dm
   My heart is paralyzed
G              C
   My head was oversized
F                Dm                 E7    E7
   I'll take the high road like I should
Am               Dm
   You said it's meant to be
G                 C
   That it's not you, it's me
F                 Dm              E7    E7
   You're leaving now for my own good
            []
That's cool but if my friends ask where you are I'm gonna say

          F
She went down in an airplane
  C
Fried getting suntan
G                   Am              G
   Fell in a cement mixer full of quicksand
 F                C                 Bm      E7
Help me, help me I'm no good at goodbyes
            F
She met a shark underwater
 C
Fell and no one caught her
G                   Am           G
   I returned everything I ever bought her
 F                C              E7
Help me, help me I'm all out of lies
                    Am  --->
And ways to say you died

{Brass Solo}
--->  Am   Dm   G    C
      F    Dm   E7   E7
```

#### Example Hebrew Song:
```
פסק זמן - אריק איינשטיין
מילים: אריק איינשטיין   לחן: שם טוב לוי

(Em   A   D   Dmaj7) x 2

Em         A        D         Dmaj7
      לקחת פסק זמן ולא לחשוב
Em          A       D          C#7
      לשבת מול הים ולא לדאוג
F#m        G#7     C#m    A7
      לתת לראש לנוח מהפיצוצים
D         C#7     F#m  A7
      לתת ללב לנוח מהלחצים
```

#### Parsing Rules

**1. Metadata (parsed from file, first lines before first empty line):**
- Line 1: `Song Title - Artist`
- Line 2+: Credits - look for patterns like:
  - Hebrew: `מילים:`, `לחן:`, `מילים ולחן:`
  - English: `Lyrics`, `Music`, `Lyrics and Music:`
- First empty line ends metadata section

**2. Chord Line Detection (content-based with regex):**
- A line is a chord line IF AND ONLY IF **all whitespace-separated tokens** match the chord pattern
- Chord regex pattern: `[A-G][#b]?(m|maj|min|dim|aug|sus[24]?|add|o)?[0-9]*(b[0-9]+)?(\/[A-G][#b]?)?!?`
- Bracketed chord pattern: `\[[A-G][#b]?(m|maj|min|dim|aug|sus[24]?|add|o)?[0-9]*(b[0-9]+)?(\/[A-G][#b]?)?\]!?`
- Special notation: `o` = diminished (e.g., `Fo7` = `Fdim7`)
- **Extended notation support:**
  - Chords with exclamation marks: `Am!`, `G7!` (emphasis/accent)
  - Bracketed chords: `[Em]`, `[Am7]` (optional/alternative)
  - Single hyphen: `-` (separator between chords)
- Edge cases like single-letter tokens: `A` alone is a valid chord
- Example of valid chord line: `Am   Dm - E - [Am]   [Am]   Am!`
- Nice-to-have: Override mechanism for edge cases

**3. Special Markers:**
| Marker | Meaning | Display (Chords Mode) | Display (Lyrics Mode) |
|--------|---------|----------------------|----------------------|
| `{...}` | Band directive | Green, italic | Hidden |
| `[...]` | Crowd cue | Red | Red |
| `--->` | Chord continuation | Blue (treat as chord) | Hidden |
| `(...)` | Inline notation | Keep as-is | Keep as-is |

**4. RTL Detection:**
- Scan lyrics lines (not chord lines) for Hebrew Unicode characters (`\u0590-\u05FF`)
- If significant Hebrew content detected → RTL mode
- JSON `direction` field overrides auto-detection if present
- **Hebrew songs: Chord lines also display RTL** (chords read from right to left)

**5. Spacing Preservation:**
- Chord lines must preserve exact character spacing from source file
- Use monospace font to ensure chords align above correct syllables
- Example: `Am             Dm` - the spaces determine chord placement over lyrics below
- **In lyrics mode only:** All lines are trimmed (no leading/trailing whitespace)
- In chords mode: Whitespace is preserved for proper chord alignment

### 5.3 SQLite Schema

```sql
-- Admin users
CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Queue entries
CREATE TABLE queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  song_id INTEGER NOT NULL,
  requester_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'played'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  played_at DATETIME
);

-- Playing state (singleton row - always id=1)
CREATE TABLE playing_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  current_song_id INTEGER,              -- NULL if no song playing
  current_verse_index INTEGER DEFAULT 0,
  current_key_offset INTEGER DEFAULT 0, -- Semitones (can be negative)
  display_mode TEXT DEFAULT 'lyrics',   -- 'lyrics' | 'chords'
  projector_width INTEGER,              -- First projector's resolution
  projector_height INTEGER,
  projector_lines_per_verse INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize singleton row
INSERT INTO playing_state (id) VALUES (1);

-- Viewer sessions (for tracking requesters and projectors)
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  requester_name TEXT,
  is_projector BOOLEAN DEFAULT FALSE,
  resolution_width INTEGER,
  resolution_height INTEGER,
  lines_per_verse INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Session cleanup: Sessions inactive for 3+ hours should be removed
-- Run periodically: DELETE FROM sessions WHERE last_seen < datetime('now', '-3 hours');
```

### 5.4 Session Keep-Alive & Retention

**Keep-Alive Mechanism:**
- Clients send periodic heartbeat via WebSocket (e.g., every 60 seconds)
- Server updates `sessions.last_seen` on each heartbeat
- Alternative: Update `last_seen` on any client activity (socket event, API call)

**Retention Policy:**
- Sessions inactive for **3 hours** are automatically deleted
- Cleanup runs:
  - On server startup
  - Periodically (e.g., every 15 minutes via setInterval)
  - Optionally: On each new session creation

**Cleanup Query:**
```sql
DELETE FROM sessions WHERE last_seen < datetime('now', '-3 hours');
```

**Impact of Session Deletion:**
- Viewer loses their "identity" for queue grouping
- Their pending queue requests remain (orphaned but still valid)
- Next visit creates a new session

---

## 6. Real-time Architecture (Socket.io)

### 6.1 Rooms/Namespaces
- `playing-now` — All viewers watching the live song
- `admin` — Admin clients (for receiving queue updates)
- `projector` — Projector clients (for resolution sync)

### 6.2 Events

#### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `song:changed` | `{ songId, verseIndex, keyOffset, displayMode }` | New song is now playing |
| `song:cleared` | `{}` | No song playing (show splash) |
| `verse:changed` | `{ verseIndex }` | Admin advanced/rewound verse |
| `key:changed` | `{ keyOffset }` | Admin changed transposition |
| `mode:changed` | `{ displayMode }` | Admin toggled lyrics-only/chords |
| `queue:updated` | `{ queue }` | Queue state changed (for admin) |
| `projector:resolution` | `{ width, height, linesPerVerse }` | First projector set resolution |
| `pong` | `{}` | Response to client ping (keep-alive) |

#### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `ping` | `{}` | Keep-alive heartbeat (send every 60s) |
| `song:set` | `{ songId }` | Admin changes current song |
| `song:clear` | `{}` | Admin clears current song (show splash) |
| `verse:set` | `{ verseIndex }` | Admin sets specific verse |
| `verse:next` | `{}` | Admin advances to next verse |
| `verse:prev` | `{}` | Admin goes to previous verse |
| `key:set` | `{ keyOffset }` | Admin sets transposition |
| `mode:set` | `{ displayMode }` | Admin sets display mode |
| `queue:add` | `{ songId, requesterName }` | Viewer adds song to queue |
| `queue:remove` | `{ queueId }` | Viewer removes their own request |
| `queue:present` | `{ queueId }` | Admin presents song from queue |
| `projector:register` | `{ width, height, linesPerVerse }` | Projector reports its resolution |

**Note:** The `ping` event updates `sessions.last_seen` for session retention (see Section 5.4).

---

## 7. Transposition Logic

### 7.1 Chromatic Scale (12 semitones)
```
C → C# → D → Eb → E → F → F# → G → Ab → A → Bb → B → C
     0    1    2    3   4    5    6    7    8   9   10   11
```

### 7.2 Enharmonic Preferences
When generating transposed chords, prefer:

| Prefer | Over |
|--------|------|
| C# | Db |
| Eb | D# |
| F# | Gb |
| Ab | G# |
| Bb | A# |

**However**: If the original file uses a "non-preferred" notation, preserve the pattern contextually.
- Example: Original `G  G#` transposed +1 semitone → `Ab  A` (the sharp becomes natural, maintaining relative movement)

### 7.3 Transposition Rules
1. Parse each chord to extract: root note, accidental (#/b), modifiers (m, 7, maj7, etc.), bass note (/X)
2. Convert root to semitone index
3. Add offset (can be negative for transposing down)
4. Map result to preferred enharmonic (mod 12)
5. Preserve all modifiers exactly
6. If chord has bass note (`/X`), transpose that too

### 7.4 Supported Chord Components
- **Root notes**: A, B, C, D, E, F, G
- **Accidentals**: # (sharp), b (flat)
- **Quality modifiers**: m, min, maj, dim, aug, o (diminished), + (augmented)
- **Extensions**: 2, 4, 5, 6, 7, 9, 11, 13
- **Suspensions**: sus, sus2, sus4
- **Additions**: add9, add11, etc.
- **Alterations**: b5, #5, b9, #9, etc.
- **Bass notes**: /C, /E, /G#, etc.

**Examples of valid chords**:
`Am`, `G7`, `Cmaj7`, `Bm7b5`, `F#dim`, `Dsus4`, `Eadd9`, `A/C#`, `Fo7`

---

## 8. Verse Calculation

### 8.1 Algorithm
1. **If projector is connected**:
   - First projector to connect reports: `linesPerVerse` (calculated client-side based on actual rendered font size and viewport height)
   - Server stores this and uses it for all clients
   - Song is chunked into verses of N lyric lines each
   - Last verse may be shorter
   
2. **If no projector connected**:
   - Default: **8 lines per verse**

### 8.2 Line Counting Rules for Verse Boundaries
- Count **lyric lines only** (lines that are not chord-only lines)
- Band directives `{...}` are hidden in lyrics-only mode, so they **don't count**
- Crowd cues `[...]` are inline within lyric lines, count the line they're in
- Empty lines act as natural separators but still count toward the limit
- Chord-only lines (pure chord lines above lyrics) do NOT count

### 8.3 Client-Side Lines Calculation (Projector)
The projector client should:
1. Render a test set of lyrics at the target font size
2. Measure how many lines fit in the viewport
3. Report this number to the server via `projector:register`

---

## 9. UI/UX Design

### 9.1 Theme
- **Primary colors**: Light blue + White
- **Accent**: Based on logo colors
- **Logo**: Piano character with guitar (bundled asset)
- **Default direction**: RTL (Hebrew-first interface)

### 9.2 Typography
- **Lyrics + Chords mode**: Monospace font (critical for chord alignment)
- **Lyrics Only mode (projection)**: Large, readable sans-serif (e.g., Heebo for Hebrew support)
- **Auto-sizing**: In band mode (lyrics+chords), shrink font to fit entire song on single screen

### 9.3 Background Images (Lyrics-Only Projection Mode)
- Bundled in `/public/backgrounds/` directory
- Images provided by admin (flowers, nature scenes - non-distracting)
- **Random selection** per song display
- Rendering:
  - Image covers full viewport
  - Semi-transparent dark overlay on top of image
  - Each text line has its own semi-transparent dark background box for extra contrast
  - Text color: Light/yellow for maximum readability

### 9.4 Responsive Design Priority
1. **Projector** (primary): Full-screen, resolution-aware, large text
2. **Tablet**: Band members viewing lyrics+chords, single-screen songs
3. **Mobile**: Functional but lower priority

- **Aspect Ratio**: Use projector's reported resolution; fallback to 16:9 if no projector

### 9.5 Admin Controls Overlay (Playing Now View)
- Position: Top-left corner
- Size: Very small, non-intrusive (4 small buttons)
- Buttons:
  - ◀ Previous verse
  - ▶ Next verse  
  - 🎤 Toggle lyrics/chords mode
  - 🎹 Toggle chord visibility
- Transpose controls: Separate, visible when in chords mode

### 9.6 Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Arrow Down / Arrow Right | Next verse |
| Arrow Up / Arrow Left | Previous verse |
| (These must work globally when admin is logged in, regardless of current tab) |

---

## 10. Song Data Loading & Caching

### 10.1 Songs Index (songs.json)

**Loading:**
- Fetched from public Git URL on server startup
- Stored in memory
- Refreshed on-demand via admin action ("Reload Songs" button)

**Flow:**
```
Server Startup → Fetch songs.json from Git URL → Store in memory
Admin clicks "Reload Songs" → Re-fetch songs.json → Update memory → Broadcast to clients
```

### 10.2 Song Lyrics Fetching

**Architecture:** Server-side fetching with in-memory caching.

**Flow:**
```
1. Client: GET /api/songs/:id/lyrics
2. Server checks in-memory cache (key: song ID)
3. If cache miss OR cached dateModified < songs.json dateModified:
   a. Fetch text file from markupUrl (raw.githubusercontent.com/...)
   b. Parse: extract metadata, detect chords, identify markers, detect RTL
   c. Calculate verse breaks
   d. Cache structured result with dateModified
4. Return structured JSON to client
```

**Cache Invalidation:**
- Lazy: On request, compare cached `dateModified` vs current `songs.json` entry
- If stale, re-fetch and re-parse before responding
- Cache is lost on server restart (acceptable for this scale)

**Structured Response Format:**
```json
{
  "metadata": {
    "title": "Song Name",
    "artist": "Artist",
    "credits": "Lyrics and Music: ...",
    "direction": "rtl"
  },
  "lines": [
    { "type": "directive", "text": "Brass and Guitar" },
    { "type": "chords", "raw": "Am   Dm   G    C" },
    { "type": "lyric", "text": "My heart is paralyzed" }
  ],
  "verseBreaks": [0, 8, 16, 24]
}
```

Client receives pre-parsed data and only handles rendering.

---

## 11. API Endpoints

### 11.1 REST API (Fastify)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | — | Admin login (username, password) → sets cookie |
| `POST` | `/api/auth/logout` | Admin | Admin logout → clears cookie |
| `GET` | `/api/auth/me` | — | Check current auth status |
| `GET` | `/api/songs` | — | List all songs (excludes private for non-admin) |
| `GET` | `/api/songs/:id` | — | Get single song metadata |
| `GET` | `/api/songs/:id/lyrics` | — | Fetch, parse, cache, return structured lyrics |
| `POST` | `/api/songs/reload` | Admin | Re-fetch songs.json from Git, update cache |
| `GET` | `/api/queue` | Admin | Get current queue (grouped, sorted) |
| `POST` | `/api/queue` | — | Add to queue (body: songId, requesterName) |
| `DELETE` | `/api/queue/:id` | — | Remove from queue (only own session's entries) |
| `GET` | `/api/state` | — | Get current playing state |

### 11.2 WebSocket Events
See Section 6.2 for complete event documentation.

---

## 12. Error Handling

| Scenario | Behavior |
|----------|----------|
| `markupUrl` fetch fails (404, timeout, network error) | Log error server-side, return "Song unavailable" message to client |
| Invalid song JSON entry | Log warning, skip invalid entry, continue loading valid songs |
| WebSocket disconnect | Auto-reconnect (Socket.io built-in), show connection indicator in UI |
| Admin session expired | Redirect to login page |
| Queue limit reached (25 per viewer) | Show error message, prevent adding |
| Invalid chord in transposition | Keep original text unchanged, log warning |

---

## 13. Project File Structure

```
platform/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entry point: Fastify + Socket.io setup
│   │   ├── config.ts             # Configuration (env vars, constants)
│   │   ├── routes/
│   │   │   ├── auth.ts           # Login/logout endpoints
│   │   │   ├── songs.ts          # Song listing and lyrics endpoints
│   │   │   └── queue.ts          # Queue management endpoints
│   │   ├── services/
│   │   │   ├── songParser.ts     # Parse lyrics/chord markup files
│   │   │   ├── chordDetector.ts  # Regex-based chord line detection
│   │   │   ├── transposer.ts     # Chord transposition logic
│   │   │   ├── verseCalculator.ts # Chunk songs into verses
│   │   │   └── rtlDetector.ts    # Hebrew/RTL detection
│   │   ├── socket/
│   │   │   ├── index.ts          # Socket.io initialization
│   │   │   └── handlers.ts       # Event handlers
│   │   ├── db/
│   │   │   ├── schema.sql        # SQLite schema
│   │   │   ├── index.ts          # Database connection + queries
│   │   │   └── migrations/       # Future migrations
│   │   └── types/
│   │       └── index.ts          # TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Root component with routing
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AdminTabs.tsx     # Tab navigation for admin
│   │   │   │   └── Header.tsx
│   │   │   ├── views/
│   │   │   │   ├── SearchView.tsx
│   │   │   │   ├── PresentationView.tsx
│   │   │   │   ├── PlayingNowView.tsx
│   │   │   │   ├── QueueView.tsx
│   │   │   │   └── LoginView.tsx
│   │   │   ├── song/
│   │   │   │   ├── LyricsDisplay.tsx     # Main lyrics renderer
│   │   │   │   ├── ChordLine.tsx         # Single chord line component
│   │   │   │   ├── LyricLine.tsx         # Single lyric line component
│   │   │   │   ├── SongHeader.tsx        # Title, artist, credits
│   │   │   │   └── TransposeControls.tsx # Key change UI
│   │   │   ├── admin/
│   │   │   │   ├── AdminControls.tsx     # Verse nav overlay
│   │   │   │   └── QueueGroup.tsx        # Grouped queue display
│   │   │   └── common/
│   │   │       ├── SearchBox.tsx
│   │   │       ├── SongList.tsx
│   │   │       └── LoadingSpinner.tsx
│   │   ├── hooks/
│   │   │   ├── useSocket.ts          # Socket.io connection hook
│   │   │   ├── useSong.ts            # Song fetching + parsing
│   │   │   ├── useAuth.ts            # Authentication state
│   │   │   ├── usePlayingNow.ts      # Playing now state subscription
│   │   │   └── useKeyboardShortcuts.ts # Global keyboard handlers
│   │   ├── context/
│   │   │   ├── AuthContext.tsx       # Admin auth state
│   │   │   ├── SocketContext.tsx     # Socket.io instance
│   │   │   └── PlayingNowContext.tsx # Current song state
│   │   ├── services/
│   │   │   ├── api.ts                # REST API client
│   │   │   └── transpose.ts          # Client-side transposition (for viewer overrides)
│   │   ├── utils/
│   │   │   ├── rtl.ts                # RTL detection utilities
│   │   │   └── formatting.ts         # Text formatting helpers
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript interfaces
│   │   └── styles/
│   │       ├── globals.css           # Global styles, CSS variables
│   │       ├── lyrics.css            # Lyrics-specific styles
│   │       └── projection.css        # Projection mode styles
│   ├── public/
│   │   ├── backgrounds/              # Background images for projection
│   │   │   ├── flowers1.jpg
│   │   │   ├── flowers2.jpg
│   │   │   └── ...
│   │   ├── splash.png                # Logo + QR for idle screen
│   │   └── logo.png                  # App logo
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── database/
│   └── singalong.db                  # SQLite database file (gitignored)
│
├── SPEC.md                           # This specification file
└── README.md                         # Setup and running instructions
```

---

## 14. Implementation Phases

### Phase 1: Project Setup & Infrastructure ✅
- [x] Initialize backend (Fastify + TypeScript)
- [x] Initialize frontend (Vite + React + TypeScript)
- [x] Set up SQLite database with schema
- [x] Implement admin authentication (login/logout/cookie)
- [x] Create basic API routes structure
- [x] Configure Socket.io on both ends

### Phase 2: Song Loading & Display (partial)
- [x] Load songs.json index
- [x] Implement markupUrl fetching with error handling
- [x] Build song parser (extract metadata, detect chord lines, parse markers)
- [x] Implement RTL/LTR auto-detection
- [ ] Create LyricsDisplay component (monospace, exact spacing)
- [ ] Apply color coding (blue chords, green directives, red cues)
- [x] Build SearchView with filtering

### Phase 3: Transposition
- [ ] Implement chord regex parser
- [ ] Build transposition function with enharmonic handling
- [ ] Create TransposeControls UI component
- [ ] Add per-viewer override capability
- [ ] Implement "sync to admin" functionality

### Phase 4: Playing Now (Real-time) (partial)
- [x] Set up Socket.io rooms (playing-now, admin)
- [x] Implement song:changed broadcast
- [x] Build PlayingNowView with live updates
- [x] Create admin controls overlay (verse nav, mode toggles)
- [ ] Implement keyboard shortcuts (global, cross-tab)
- [x] Build idle/splash screen for no-song state

### Phase 5: Verse System (partial)
- [x] Implement verse calculation algorithm
- [x] Build projector registration flow
- [ ] Create client-side lines-per-verse measurement
- [x] Implement verse:next/prev events
- [ ] Add verse mode toggle for viewers

### Phase 6: Projection Mode
- [ ] Implement lyrics-only display mode
- [ ] Add background image system (random selection)
- [ ] Create semi-transparent overlays for text contrast
- [ ] Build responsive layout for projector
- [ ] Handle font auto-sizing

### Phase 7: Queue System (partial)
- [x] Implement queue database operations
- [ ] Build "Add to Queue" flow (name prompt, confirmation)
- [x] Create QueueView for admin (grouped display)
- [x] Implement "Present from Queue" action
- [ ] Add fairness logic (group moves to bottom after presentation)
- [ ] Build viewer's "my requests" view with cancel option

### Phase 8: Polish & Edge Cases (partial)
- [x] Add loading states and spinners
- [ ] Implement error boundaries and error messages
- [x] RTL styling refinements across all views
- [ ] Mobile responsiveness improvements
- [x] Connection status indicators
- [ ] Final UI/UX polish (theme, logo integration)

---

## 15. Configuration & Environment Variables

### Backend (.env)
```env
# Server
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_PATH=./database/singalong.db

# Authentication
JWT_SECRET=your-secret-key-here
COOKIE_SECRET=your-cookie-secret

# Songs - fetched from Git URL on startup, refreshed via admin action
SONGS_JSON_URL=https://raw.githubusercontent.com/.../songs.json

# Admin credentials (for initial setup)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=...
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

---

## 16. Testing Considerations

### Manual Testing Checklist
- [ ] Admin can log in and see all songs (including private)
- [ ] Viewer cannot see private songs in search
- [ ] Song lyrics display correctly with proper chord alignment
- [ ] Hebrew songs display RTL correctly
- [ ] Transposition works for all chord types
- [ ] Playing Now syncs across multiple browser tabs/devices
- [ ] Verse navigation works with keyboard shortcuts
- [ ] Queue grouping and fairness logic works correctly
- [ ] Projector mode calculates verses based on screen size
- [ ] Background images display properly in lyrics-only mode
- [ ] Admin "Reload Songs" button refreshes song list from Git

### Edge Cases to Test
- Very long songs (font auto-shrinking)
- Songs with unusual chord notations
- Songs with only Hebrew or only English
- Empty queue states
- Multiple viewers with same name
- Rapid verse navigation
- Network disconnection and reconnection

---

## 17. Future Considerations (Out of Scope for V1)

1. **Multiple simultaneous events/rooms**: Support different venues/events at once
2. **Song caching**: Pre-download all songs for offline resilience
3. **Setlist feature**: Pre-plan song order for a show
4. **Song editing UI**: Admin interface to edit lyrics (currently Git-only)
5. **Analytics**: Track popular songs, frequent requesters
6. **Mixed-language songs**: Hebrew lyrics with English words
7. **Auto-scroll**: Automatically advance verses on a timer
8. **Song categories/filtering**: Filter by category in search
9. **Favorites**: Let viewers mark favorite songs
10. **History**: Show recently played songs

---

## 18. Visual Reference

### Lyrics + Chords Mode (Band View)
- White background
- Section headers in green italic: *Brass and Guitar*
- Chords in blue, positioned with exact spacing above lyrics
- Lyrics in black
- Crowd cues `[]` in red
- All content on single screen (auto-shrink font)

### Lyrics Only Mode (Projection View)  
- Background: Nature image (flowers) with dark overlay
- Header bar with song title (bold), artist, and credits
- Lyrics in large yellow/light text
- Each line has semi-transparent dark background box
- Crowd cues `[]` visible in red
- Only current verse shown (verse mode) or full song (full mode)

### Color Scheme Quick Reference
| Element | Color |
|---------|-------|
| Lyrics text | Black (chords mode) / Light yellow (projection) |
| Chords | Blue |
| Band directives `{}` | Green (italic) |
| Crowd cues `[]` | Red |
| Continuation `--->` | Blue |
| Background (chords mode) | White |
| Background (projection) | Image + dark overlay |


# SingWithAlon - Sing-Along Web Application Specification

## 1. Overview

A real-time web application for managing sing-along events and band performances. The app displays song lyrics and chords, supports live synchronization across multiple viewers, and enables audience participation through a song request queue.

### Multi-Tenant Architecture
The application supports multiple independent **rooms**, each controlled by a different admin. Each room operates as a completely isolated sing-along experience with its own:
- Playing state (current song, verse, key offset)
- Song request queue
- Connected viewers and projectors

### Core Concepts
- **Room**: An isolated sing-along space owned by one admin (identified by username in the URL)
- **Admin (Room Owner)**: Controls their room - which song is playing, manages the queue, advances verses
- **Viewer**: Watches a specific room's current song, can request songs from the catalog
- **Projector**: A special viewer type that displays lyrics for a crowd; its resolution determines verse boundaries for that room

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
| Database | LibSQL/Turso (SQLite-compatible; local file for dev, Turso for production) |
| Song Storage | JSON index file + text files (lyrics/chords) stored externally, fetched via URL |

---

## 3. User Roles & Authentication

### 3.1 URL Structure (Room-Based)

All URLs are scoped to a specific room identified by the admin's username:

| URL | Purpose | Auth Required |
|-----|---------|---------------|
| `http://mydomain.com/:username` | Viewer entry point for a specific room | No |
| `http://mydomain.com/:username/admin` | Admin entry point for a specific room | No (initially) |
| `http://mydomain.com/` | Redirects to default room (`/:defaultRoom`) | No |
| `http://mydomain.com/admin` | Redirects to default room admin (`/:defaultRoom/admin`) | No |

**Room Viewer URL (`/:username`):**
- Goes directly to Search View for that room
- No login option visible
- Full viewer functionality (search, view songs, add to queue, watch Playing Now)
- All actions are scoped to the specified room

**Room Admin URL (`/:username/admin`):**
- Initially looks and functions exactly like viewer
- Has a visible "Login" button/option
- Login validates against the room's admin credentials only
- After successful login (if credentials match room owner):
  - Page refreshes/updates
  - Room owner permissions granted
  - Queue tab becomes visible
  - Private songs become visible
  - "Present Now" buttons appear on songs
  - Admin controls appear on Playing Now view
- Attempting to log in with different admin credentials fails (strict room ownership)

### 3.2 Admin (Room Owner)
- **Authentication**: Username + password → stored as HTTP-only cookie
- **Room Ownership**: Each admin owns exactly one room (identified by their username)
- **Capabilities** (after login, within their own room only):
  - View all songs (including private)
  - Search and present any song
  - Control "Playing Now" (change song, advance verses, set key/transpose)
  - Manage queue (view, present from queue)
  - Toggle between lyrics-only and lyrics+chords modes
  - Clear current song (return to splash screen)
- **Authorization**: Admins can only control their own room; attempting to control another room results in 403 Forbidden
- **Admin Menu** (☰ hamburger icon in header):
  - "נקה שיר" - Clear current song and return to splash screen
  - "התנתק" - Log out
- **Projector Mode**: Admin can toggle "This is a projector" during/after login
  - Checkbox during login OR button in UI after login
  - First projector to connect to a room sets the resolution for that room's verse calculation
  - Subsequent projectors in the same room receive the same verse boundaries (may display incorrectly if different resolution)

### 3.3 Viewer (Anonymous)
- **No authentication required**
- **Room-Scoped**: All viewer actions are scoped to the room they're viewing
- **Session Isolation**: Each room visit generates a unique session ID (opening the same room in two tabs creates two separate sessions)
- **Capabilities**:
  - Browse and search public songs (global catalog)
  - View any public song's lyrics/chords
  - Add songs to the room's queue (with their name)
  - Watch the room's "Playing Now" screen
  - Toggle personal preferences:
    - Lyrics-only vs Lyrics+chords
    - Verse mode vs Full-song mode
    - Override transposition (in chords mode only, absolute offset -6 to +6)
  - View and cancel their own queue requests within the room

---

## 4. Views / Screens

### 4.1 Search View
- **Purpose**: Browse and find songs
- **Components**:
  - Text search box (filters by song name AND artist simultaneously)
  - Clear button ("נקה" with red ✕ icon) to reset search filter
  - Reload button (🔄 icon, admin only) to refresh song list from Git
  - List of songs (name, artist, optional category badges)
  - Private songs: visible to admin only
- **Sticky Search Bar**: Search header remains fixed at top when scrolling through song list
- **Song Status Colors**: Each song card has a background color indicating its status:
  | Color | Meaning | Condition |
  |-------|---------|-----------|
  | Light Green | Currently playing | Song is set as current via Present Now or Queue |
  | Light Yellow | In queue (pending) | Any viewer has added this song to the queue |
  | Light Grey | Already played | Song was presented (from queue or directly) |
  | White | No status | Song never played, not in queue |
  - Priority: Green > Yellow > Grey (if multiple conditions apply, higher priority wins)
  - All status colors reset when admin truncates the queue (including Green, since truncate also clears the current song)
  - Status updates in real-time via WebSocket (`songs:status-changed` event)
  - Both admins and viewers see these colors
- **Actions**:
  - Click song → go to Presentation View (that song)
  - Viewer can click "Add to Queue" (prompts for name, shows confirmation)
  - Admin can click "Present Now" (immediately goes to Playing Now)
- **Sorting**: Songs are sorted lexicographically by name:
  - Hebrew songs first (sorted alphabetically in Hebrew)
  - English songs second (sorted alphabetically in English)
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
  - Chord continuation arrows (`--->`, `-->`, `<---`, `<--`) shown in blue
- **Layout**: Single-screen, auto-shrink font to fit all content
- **Transposition controls**: Visible, allows key change

#### 4.2.2 Lyrics Only Mode (Crowd/Projection Mode)
- **Styling**:
  - Background: Random image from bundled collection with semi-transparent dark overlay
  - Text: High-contrast (light/yellow text on dark semi-transparent boxes per line)
  - Song title, artist, and credits displayed at top header bar
- **Credits Display**:
  - Composer, lyricist, and translator fetched from songs.json database
  - When composer and lyricist are the same: shows "מילים ולחן:" (Hebrew) or "Lyrics and Music:" (English)
  - Otherwise shows separate entries: "לחן:" / "מילים:" or "Music:" / "Lyrics:"
  - Translator shown as "תרגום:" or "Translation:" when present
  - Language auto-detected based on song direction (RTL = Hebrew labels, LTR = English labels)
- **Verse Mode** (default for projectors):
  - Only current verse visible
  - Admin controls which verse is highlighted
- **Full-Song Mode** (viewer toggle):
  - All lyrics visible, scrollable
- **Transposition controls**: Visible in chords mode only
- **Hidden elements**: Band directives `{}`, continuation arrows (`--->`, `-->`, `<---`, `<--`)
- **Visible elements**: Crowd cues `[]` in red

#### Common Features
- **Transposition**:
  - Admin sets global key offset (-6 to +6 semitones)
  - Viewers can override locally with their own absolute offset
  - Admin can push key to all viewers via sync button (📡)
  - Subtle visual indicator (●) when viewer is out of sync with admin
- **RTL Support**:
  - Auto-detected via Hebrew Unicode characters (`\u0590-\u05FF`)
  - Chords remain LTR but positioned according to source file spacing
  - Entire layout flips for RTL songs

### 4.3 Playing Now View
- **Purpose**: Live, synchronized song display for everyone in the room
- **Room-Scoped**: Shows the current song for the specific room being viewed
- **Behavior**:
  - WebSocket-connected to server, joined to room's broadcast channel
  - When room owner changes song, all connected viewers in that room see new song
  - When room owner advances verse, all viewers in that room in verse-mode see update
  - 500ms latency tolerance is acceptable
  - Updates from other rooms are isolated and don't affect this view
- **Initial State** (no song playing):
  - Display custom splash screen with logo + QR code (admin-provided image asset)
- **Viewer Controls** (visible to all):
  - Toggle: Lyrics-only ↔ Lyrics+chords
  - Toggle: Verse mode ↔ Full-song mode (non-projectors only)
  - Fullscreen button (⤢) - only in lyrics mode, see Fullscreen Mode below
  - Transposition controls (only in chords mode): `[ ⬇ ] N [ ⬆ ]` with out-of-sync indicator
- **Fullscreen Mode** (lyrics mode only):
  - Clicking fullscreen button (⤢) enters browser fullscreen mode
  - Hides app header and song top bar
  - Shows dedicated song metadata header with:
    - Song title (large, prominent)
    - Artist name
    - Credits (composer, lyricist, translator if applicable)
  - Metadata header uses semi-transparent background, visually distinct from lyrics
  - Header remains visible across all verses
  - Press Escape to exit fullscreen (browser native behavior)
  - On exit, original headers are restored
- **Room Owner Controls** (small overlay, top-left corner, non-intrusive, visible only to room owner):
  - Previous verse button (◀)
  - Next verse button (▶)
  - Toggle verses enabled (📖)
  - Toggle display mode (🎸/🎤)
  - Transpose controls: `[ ⬇ ] N [ ⬆ ] [ 📡 ]` (always visible since owner always sees chords)
- **Keyboard Shortcuts** (critical for Bluetooth pedal support):
  - Arrow Up / Page Up → Previous verse
  - Arrow Down / Page Down → Next verse
  - **Works globally when room owner is logged in and in admin mode, regardless of focused element**

### 4.4 Queue View (Room Owner Only)
- **Purpose**: Manage song requests from viewers in the room
- **Room-Scoped**: Shows only the queue for the current room
- **Real-time Updates**: Queue updates automatically via WebSocket when viewers add/remove songs
- **Display**:
  - Grouped by requester (name + session ID combination)
  - Groups sorted by first request timestamp (earliest first)
  - Within each group: FIFO order
  - Clear visual separation between groups with requester name as group header
- **Song Entry Display**:
  - Song name + artist
  - "Present" button (▶)
  - Delete button (✕) to remove individual song from queue
  - Visual state: pending (normal) / played (grayed out, at bottom of group)
- **Group Management**:
  - Delete group button (✕) on group header to remove all songs from that requester+session
  - **Note**: Group = unique combination of requester name AND session ID. Same person with different names creates separate groups.
- **Queue Management**:
  - "Truncate Queue" button at top to clear entire queue (with confirmation)
  - Truncating the queue also clears the current song (returns to splash screen)
- **Behavior on "Present"**:
  - Song goes to "Playing Now" immediately
  - Queue entry marked as "played" (grayed, moves to bottom of its group)
  - **Entire group moves to bottom of the overall queue** (fairness mechanism to prevent starvation)
- **Limits**:
  - Max 25 songs per viewer in queue

### 4.5 Admin Navigation
- **Header** displays room's display name (e.g., "שרים עם אלון") as the logo/title
- **Tab Bar** at top of screen with 3 tabs:
  - Search
  - Playing Now
  - Queue
- All tabs accessible at any time (links are room-scoped: `/:username/playing-now`, etc.)
- **Keyboard shortcuts for verse navigation work across ALL tabs** (only when room owner)
- **"Reload Songs" button** (in header or settings): Re-fetches songs.json from Git URL, updates song list

### 4.6 Frontend Routing (SPA)

All routes are room-scoped using the admin's username as the room identifier:

| Route | View | Notes |
|-------|------|-------|
| `/` | — | Redirects to `/:defaultRoom` |
| `/admin` | — | Redirects to `/:defaultRoom/admin` |
| `/:username` | Search View | Viewer entry point for room |
| `/:username/admin` | Search View | Admin entry point for room (login option visible) |
| `/:username/song/:id` | Presentation View | View single song in room context |
| `/:username/playing-now` | Playing Now View | Live synchronized view for room |
| `/:username/queue` | Queue View | Room owner only (redirects to `/:username/admin` if not owner) |

**Behavior:**
- `/:username` and `/:username/admin` render the same Search View component
- The difference is contextual: `/admin` routes show login button and enable admin mode
- After admin login, room owner capabilities are granted only if username matches
- Direct navigation to `/:username/queue` by non-owner redirects to `/:username/admin`
- Navigating to an invalid room (non-existent username) shows "Room not found" error
- Room context (display name, admin ID) is fetched on route mount

**Admin Mode vs Viewer Mode:**
- Entering via `/:username/admin` or `/:username/queue` sets "admin mode"
- Entering via `/:username` sets "viewer mode"
- Admin mode + room ownership = full admin controls visible
- Navigating between modes preserves authentication but changes UI behavior

**Room Validation:**
- On entering any room route, frontend fetches `GET /api/rooms/:username`
- If room exists and is active: room context is established, UI renders
- If room doesn't exist or is inactive: "Room not found" error displayed immediately
- Room context includes: `adminId`, `username`, `displayName`

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
- Chord regex pattern: `[A-G][#b]?(m|min|Min|M|maj|Maj|dim|aug|add|o|°|º|\+)?[0-9]*(sus[24]?)?(b[0-9]+)?(\/[A-G][#b]?)?!?`
- Bracketed chord pattern: `\[[A-G][#b]?(m|min|Min|M|maj|Maj|dim|aug|add|o|°|º|\+)?[0-9]*(sus[24]?)?(b[0-9]+)?(\/[A-G][#b]?)?\]!?`
- **Note:** Suspension modifiers (`sus`, `sus2`, `sus4`) appear after extension numbers to support chords like `B7sus4`, `A9sus4`, `Cm7sus4`
- Bass-only pattern: `\/[A-G][#b]?` (just a note, e.g., `/F`, `/Bb`, `/A`, `/F#`)
- Bracketed bass-only pattern: `\[\/[A-G][#b]?\]` (e.g., `[/A]`, `[/F#]`)
- Empty brackets: `[]` (valid placeholder token in chord lines)
- Special notation: `o`, `°`, or `º` = diminished (e.g., `Fo7` = `F°7` = `Fdim7`), `+` = augmented
  - Note: `o` (lowercase letter), `°` (U+00B0 degree sign), and `º` (U+00BA masculine ordinal) are all valid in source files; display always uses `°` for elegance
- **Extended notation support:**
  - Major chord suffixes: `maj`, `Maj`, `M` (e.g., `CMaj7`, `DM9`, `Fmaj7`)
  - Minor chord suffixes: `m`, `min`, `Min` (e.g., `Am`, `Cmin7`, `DMin7`)
  - Chords with exclamation marks: `Am!`, `G7!` (emphasis/accent)
  - Bracketed chords: `[Em]`, `[Am7]` (optional/alternative)
  - Single hyphen: `-` (separator between chords)
  - Bass-only notation: `/F`, `/Bb`, `/A` (valid), but NOT `/C7`, `/Fm7`, `/F#o7` (invalid - qualities not allowed)
  - Repeat markers: `x` followed by digit (e.g., `x 2`, `x 3`)
  - Parenthesized progressions: `(Cm Ab Eb Bb) x 2`
  - **Inline directives:** `{...}` (e.g., `{אקפלה}`, `{Intro}`) - band instructions within chord lines
- Edge cases like single-letter tokens: `A` alone is a valid chord
- Example of valid chord line: `Am   Dm - E - [Am]   [/A]   [] Am!`
- Example with suspensions: `B7sus4   Asus4   G7sus2` (extension number + suspension modifier)
- Example with inline directive: `       Am       {אקפלה}` (chord + directive on same line)
- **Unit tests:** See `backend/src/tests/chord-validation.test.ts` for comprehensive test suite
- Nice-to-have: Override mechanism for edge cases

**3. Special Markers:**
| Marker | Meaning | Display (Chords Mode) | Display (Lyrics Mode) |
|--------|---------|----------------------|----------------------|
| `{...}` | Band directive | Green (not italic) | Hidden |
| `[...]` | Crowd cue (non-chord text) | Red | Red |
| `--->`, `-->`, `<---`, `<--` | Chord continuation arrows | Blue (treat as chord) | Hidden |
| `(...)` | Inline notation | Keep as-is | Keep as-is |

**Note on `{...}` directives:** Directives can appear as standalone lines OR inline within chord lines. When inline (e.g., `Am {אקפלה}`), the directive is styled green while surrounding chords are styled blue. In lyrics mode, the entire chord line (including inline directives) is hidden.

**Note on arrows:** Continuation arrows can point either direction (left `<` or right `>`) and use either 2 or 3 hyphens. Use left-pointing arrows (`<---`, `<--`) for Hebrew/RTL songs and right-pointing arrows (`--->`, `-->`) for English/LTR songs. During RTL reversal, arrow directions are automatically flipped.

**Note on `[...]` detection:** Bracketed content is a **cue** only if the inner text is NOT a valid chord token. If the content is a chord (e.g., `[Am]`, `[/A]`), it's treated as a bracketed chord on a chord line. If it's non-chord text (e.g., `[Hey!]`, `[Clap]`), it's a crowd cue displayed in red.

**4. RTL Detection:**
- Scan lyrics lines (not chord lines) for Hebrew Unicode characters (`\u0590-\u05FF`)
- If significant Hebrew content detected → RTL mode
- JSON `direction` field overrides auto-detection if present
- **RTL Directional Characters:** Lines may contain invisible Unicode directional control characters (`U+200E` LRM, `U+200F` RLM, `U+061C` ALM, `U+2066-U+2069` isolates). These are stripped before chord detection and RTL reversal to ensure correct parsing.
- **Hebrew songs: Chord lines are reversed server-side** for proper RTL display:
  1. Strip any directional control characters from the line
  2. Reverse the entire chord line string character by character
  3. For each token, reverse it back to restore chord names
  4. For tokens with unbalanced brackets, move bracket to opposite side and swap type
  5. For arrow tokens, flip their direction (`--->` becomes `<---`, etc.)
  6. For `{...}` directive tokens: Hebrew content stays reversed, English content is restored
  - Example: `"   C  G Am  D  Em    Em"` → `"Em    Em  D  Am G  C   "`
  - Example with parens: `"(Cm   Ab   Eb   Bb) x 2"` → `"2 x (Bb   Eb   Ab   Cm)"`
  - Example with mixed brackets: `"(Dm   Am   [E]   Am) x 3"` → `"3 x (Am   [E]   Am   Dm)"`
  - Example with bass-only: `"/E /E /A [/A]"` → `"[/A] /A /E /E"`
  - Example with arrows: `"Am --->  G"` → `"G  <--- Am"`
  - Example with Hebrew directive: `"Am       {אקפלה}"` → `"{הלפקא}       Am"` (Hebrew content reversed for bidi-override)
  - Example with English directive: `"G   {Intro}   Am"` → `"Am   {Intro}   G"` (English content preserved)
- **CSS for RTL chord lines:** Reversed chord lines are displayed with `direction: ltr` (to preserve spacing) and `text-align: right` (to align with RTL lyrics)

**5. Spacing Preservation:**
- Chord lines must preserve exact character spacing from source file
- Use monospace font to ensure chords align above correct syllables
- Example: `Am             Dm` - the spaces determine chord placement over lyrics below
- **In lyrics mode only:** All lines are trimmed (no leading/trailing whitespace)
- In chords mode: Whitespace is preserved for proper chord alignment

### 5.3 SQLite Schema (Multi-Tenant)

All state tables are scoped to a specific admin (room) via `admin_id` foreign key:

```sql
-- Admin users (each admin owns one room)
CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,        -- Used in URLs: /:username/
  password_hash TEXT NOT NULL,
  display_name TEXT,                    -- Friendly name shown in UI (e.g., "שרים עם אלון")
  is_active BOOLEAN DEFAULT TRUE,       -- Soft delete: inactive rooms return 404
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Per-room playing state (one row per room)
CREATE TABLE playing_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
  current_song_id INTEGER,              -- NULL if no song playing
  current_verse_index INTEGER DEFAULT 0,
  current_key_offset INTEGER DEFAULT 0, -- Semitones (can be negative)
  display_mode TEXT DEFAULT 'lyrics',   -- 'lyrics' | 'chords'
  verses_enabled INTEGER DEFAULT 1,     -- 1 = show verses, 0 = show full song
  projector_width INTEGER,              -- First projector's resolution for this room
  projector_height INTEGER,
  projector_lines_per_verse INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Per-room queue entries
CREATE TABLE queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL,
  requester_name TEXT NOT NULL,
  session_id TEXT NOT NULL,             -- Unique per room visit
  notes TEXT,
  status TEXT DEFAULT 'pending',        -- 'pending' | 'played'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  played_at DATETIME
);

-- Per-room viewer sessions (for tracking requesters and projectors)
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,          -- Unique per room visit (not per user)
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  requester_name TEXT,
  is_projector BOOLEAN DEFAULT FALSE,
  resolution_width INTEGER,
  resolution_height INTEGER,
  lines_per_verse INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Song index cache (mirrors songs.json for offline querying)
-- Refreshed on server startup and when admin clicks "Reload Songs"
CREATE TABLE songs (
  id INTEGER PRIMARY KEY,               -- External song ID from songs.json
  name TEXT NOT NULL,
  artist TEXT NOT NULL,                 -- Called "singer" in JSON
  composers TEXT,                       -- JSON array: '["Person A", "Person B"]'
  lyricists TEXT,                       -- JSON array
  translators TEXT,                     -- JSON array
  category_ids TEXT,                    -- JSON array: '["1", "5"]'
  is_private INTEGER DEFAULT 0,         -- Boolean: 0 or 1
  markup_url TEXT,                      -- NULL if song has no lyrics file
  direction TEXT,                       -- 'ltr' | 'rtl' | NULL (auto-detect)
  date_created INTEGER,                 -- Unix timestamp in ms (from JSON)
  date_modified INTEGER,                -- Unix timestamp in ms
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient room-scoped queries
CREATE INDEX idx_playing_state_admin ON playing_state(admin_id);
CREATE INDEX idx_queue_admin ON queue(admin_id);
CREATE INDEX idx_sessions_admin ON sessions(admin_id);
CREATE INDEX idx_admins_active ON admins(is_active);
CREATE INDEX idx_songs_name ON songs(name);
CREATE INDEX idx_songs_artist ON songs(artist);
CREATE INDEX idx_songs_is_private ON songs(is_private);

-- Session cleanup: Sessions inactive for 3+ hours should be removed
-- Run periodically: DELETE FROM sessions WHERE last_seen < datetime('now', '-3 hours');
```

**Room Initialization:**
- When an admin is created (via `ADMIN_USERS` env var), a corresponding `playing_state` row is automatically created
- Each admin has exactly one `playing_state` row (enforced by UNIQUE constraint on `admin_id`)

**Songs Table Sync:**
- The `songs` table mirrors the external `songs.json` index for offline querying (analytics, queue debugging)
- Synced automatically on server startup and when any admin clicks "Reload Songs"
- Sync is non-blocking (fire-and-forget) — clients don't wait for it to complete
- Table is fully replaced on each sync (DELETE all + INSERT all)
- Multi-value fields (composers, lyricists, translators, category_ids) stored as JSON arrays
- No FK constraints to queue/analytics — song_id is a "soft reference"

### 5.4 Session Keep-Alive & Retention

**Session Isolation:**
- Each room visit generates a unique session ID
- Opening the same room in two browser tabs creates two separate sessions
- Opening different rooms creates separate sessions per room
- Session IDs are stored in localStorage with room-specific keys

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
- Viewer loses their "identity" for queue grouping in that room
- Their pending queue requests remain (orphaned but still valid)
- Next visit creates a new session

---

## 6. Real-time Architecture (Socket.io)

### 6.1 Architecture Pattern: REST + Broadcast

The application uses a **REST + Broadcast** pattern:
- **Client → Server requests**: Use REST API (provides immediate response, HTTP status codes, error handling)
- **Server → Client broadcasts**: Use Socket.io (pushes updates to all relevant clients in the same room)

This pattern ensures:
- Admin actions get immediate feedback (success/failure via HTTP response)
- All clients in the same room receive real-time updates (via socket broadcasts)
- No duplicate logic between REST and socket handlers
- Room isolation: events in one room don't affect other rooms

### 6.2 Rooms/Namespaces (Per-Room Scoping)

Socket.io rooms are namespaced by admin ID for complete isolation:

- `room:{adminId}:viewers` — All viewers watching this room's live song
- `room:{adminId}:admin` — Admin client for this room (for receiving queue updates)
- `room:{adminId}:projectors` — Projector clients for this room (for resolution sync)

**Client Connection Flow:**
1. Client connects to Socket.io server
2. Client emits `join:room` with `{ roomUsername, adminId }`
3. Server adds client to appropriate room namespace
4. Client receives broadcasts only for their joined room

### 6.3 Events

#### Server → Client (Broadcasts)
All broadcasts are scoped to the specific room (sent to `room:{adminId}:*` namespaces):

| Event | Payload | Description |
|-------|---------|-------------|
| `song:changed` | `{ songId, verseIndex, keyOffset, displayMode, versesEnabled }` | New song is now playing in room |
| `song:cleared` | `{}` | No song playing in room (show splash) |
| `verse:changed` | `{ verseIndex }` | Room admin advanced/rewound verse |
| `key:sync` | `{ keyOffset }` | Room admin pushed key to all viewers |
| `mode:changed` | `{ displayMode }` | Room admin toggled lyrics-only/chords |
| `verses:toggled` | `{ versesEnabled }` | Room admin toggled verses mode on/off |
| `queue:updated` | `{ queue }` | Room's queue state changed |
| `songs:status-changed` | `{ currentSongId, pendingSongIds, playedSongIds }` | Room's song status changed |
| `projector:resolution` | `{ width, height, linesPerVerse }` | First projector in room set resolution |
| `pong` | `{}` | Response to client ping (keep-alive) |

#### Client → Server (Connection/Auth)
| Event | Payload | Description |
|-------|---------|-------------|
| `join:room` | `{ roomUsername, adminId }` | Join a specific room's broadcasts |
| `ping` | `{}` | Keep-alive heartbeat (send every 60s) |
| `auth:admin` | `{ sessionId, adminId }` | Admin joins their room's admin channel |

**Note:** All mutations (song changes, queue operations, etc.) are performed via REST API. The REST endpoints then broadcast socket events to notify all clients in the affected room. See Section 11.1 for REST API endpoints.

---

## 7. Transposition Logic

### 7.1 Architecture
- **Transposition is performed entirely in the frontend** (client-side)
- Server sends original chord strings; clients transform based on their local `keyOffset`
- **All key offset changes are local** - no server calls when admin or viewer adjusts their key
- Server is only involved when admin clicks sync button (broadcasts current key to all viewers)
- This keeps transposition simple and avoids unnecessary network traffic

### 7.2 Chromatic Scale (12 semitones)
```
C → C# → D → Eb → E → F → F# → G → Ab → A → Bb → B → C
     0    1    2    3   4    5    6    7    8   9   10   11
```

### 7.3 Enharmonic Handling

#### Priority: Original > Preferred > Less Preferred

1. **Original notation is preserved** when offset = 0
   - If source file has `G#`, display `G#` (not `Ab`)
   - Respect the song author's choice of notation

2. **Preferred notation** used when transposition creates a new accidental
   - When a transposed note lands on a "black key", use the preferred spelling

| Prefer | Over |
|--------|------|
| C# | Db |
| Eb | D# |
| F# | Gb |
| Ab | G# |
| Bb | A# |

#### Examples
- `G#` with offset 0 → `G#` (original preserved)
- `G` with offset +1 → `Ab` (preferred, not G#)
- `Db` with offset 0 → `Db` (original preserved, even though C# is "preferred")
- `Db` with offset +1 → `D` (natural note, no preference needed)

### 7.4 Transposition Rules
1. Parse each chord to extract: root note, accidental (#/b), modifiers (m, 7, maj7, etc.), bass note (/X)
2. Convert root to semitone index
3. Add offset (can be negative for transposing down)
4. Map result to preferred enharmonic (mod 12)
5. Preserve all modifiers exactly
6. If chord has bass note (`/X`), transpose that too

### 7.5 Supported Chord Components
- **Root notes**: A, B, C, D, E, F, G
- **Accidentals**: # (sharp), b (flat)
- **Quality modifiers**: m, min, maj, dim, aug, o (diminished), °/º (diminished, alternate notation), + (augmented)
- **Extensions**: 2, 4, 5, 6, 7, 9, 11, 13
- **Suspensions**: sus, sus2, sus4 (can be combined with extensions: `B7sus4`, `A9sus4`)
- **Additions**: add9, add11, etc.
- **Alterations**: b5, #5, b9, #9, etc.
- **Bass notes**: /C, /E, /G#, etc.

**Examples of valid chords**:
`Am`, `G7`, `Cmaj7`, `Bm7b5`, `F#dim`, `Dsus4`, `B7sus4`, `A9sus4`, `Cm7sus4`, `Eadd9`, `A/C#`, `Fo7`, `B°7`

### 7.6 Diminished Notation
- Three characters are recognized as diminished notation during parsing:
  - `o` (lowercase letter o)
  - `°` (U+00B0 degree sign)
  - `º` (U+00BA masculine ordinal indicator) - often typed by mistake since it looks similar
- When rendering, always display `°` (degree sign) for elegance
- Display formatting is handled by `chordDisplay.ts` (separate from transposition logic)
- Examples: Input `Fo7`, `F°7`, or `Fº7` all display as `F°7`

### 7.7 Spacing After Transposition
- **Current approach**: Maintain chord start positions after transposition
- Each chord starts at the same character index as in the original line
- Spacing between chords is adjusted: reduced when chords get longer, increased when shorter
- Example: `D    G` → `Eb   Ab` (chords start at same positions, spacing adjusted)
- **Future enhancement**: Token-based rendering to anchor chords to syllable positions in lyrics

### 7.8 Transposition UI

#### Admin Controls
- Located in the admin controls bar (Playing Now view)
- Components: `[ ⬇ ] 0 [ ⬆ ] [ 📡 ]`
  - `⬇` / `⬆`: Decrease/increase offset
  - Number: Current offset (-6 to +6), default 0
  - `📡`: "Push to all viewers" sync button
- **Always visible** (admin always sees chords mode)

#### Viewer Controls
- Same `[ ⬇ ] N [ ⬆ ]` controls (without sync button)
- **Only visible when in chords mode** (`displayMode === 'chords'`)
- Shows absolute offset value (e.g., `+3`, `-2`, `0`)

#### Offset Range
- Valid values: -6 to +6 semitones
- Displayed as signed integer: `-6`, `-5`, ... `0`, `+1`, ... `+6`

### 7.9 Per-Viewer Override

#### Behavior
- Viewers can set their own transposition independently of admin
- Override is **absolute** (not relative to admin)
- Stored in React state (not persisted to server)

#### Sync Mechanism
- Admin clicks `📡` sync button to push current key to all viewers
- Admin's current local key is sent to server via REST: `POST /api/rooms/:username/state/key/sync { keyOffset }`
- Server broadcasts `key:sync` event with `{ keyOffset }` to all clients
- Viewers adopt admin's key as their new local offset (can adjust independently afterward)

#### Out-of-Sync Indicator
- When viewer's effective offset differs from admin's offset, show subtle indicator
- Example: Small dot or asterisk next to the offset number: `+3 ●`
- Indicates "you're not following admin's key"

---

## 8. Verse Calculation

> **Note:** Verse calculation is performed entirely in the frontend (`utils/verseCalculator.ts`). See `VERSES.md` for detailed implementation specification.

### 8.1 Algorithm
1. **If projector is connected to the room**:
   - First projector to connect to a room reports: `linesPerVerse` (calculated client-side based on actual rendered font size and viewport height)
   - Server stores this in the room's `playing_state` record
   - Song is chunked into verses of N lyric lines each
   - Last verse may be shorter
   - Each room has its own projector settings (different rooms can have different verse sizes)
   
2. **If no projector connected to the room**:
   - Default: `DEFAULT_LINES_PER_VERSE` (see `frontend/src/utils/verseCalculator.ts`)

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
- **Lyrics Only mode (projection)**: Large, readable sans-serif (Rubik for Hebrew, with Heebo fallback)
- **Auto-sizing**: 
  - In band mode (lyrics+chords), shrink font to fit entire song on single screen
  - In lyrics mode, dynamic font sizing measures actual text span widths (not wrapper elements)
  - Long lines trigger font reduction until all text fits without clipping
  - Uses binary search to find optimal font size efficiently

### 9.3 Background Images (Lyrics-Only Projection Mode)
- Bundled in `/public/backgrounds/` directory
- Images provided by admin (pastoral/nature scenes - non-distracting)
- **Dynamic discovery**: All `.png`, `.jpg`, `.jpeg` files in the directory are automatically detected at build time using Vite's `import.meta.glob` - no code changes needed when adding new images
- **Random selection** per song: Each new song gets a random background (avoiding repeats)
- **Browser caching**: All backgrounds are preloaded on app startup to ensure fast switching
- Rendering:
  - Image covers full viewport
  - Semi-transparent cream/light overlay for pastoral images (complementary to nature scenes)
  - Text: Deep forest green for lyrics, warm terracotta for cues
  - Clean, elegant typography using Rubik font for Hebrew readability

### 9.4 Responsive Design Priority
1. **Projector** (primary): Full-screen, resolution-aware, large text
2. **Tablet**: Band members viewing lyrics+chords, single-screen songs
3. **Mobile**: Functional but lower priority

- **Aspect Ratio**: Use projector's reported resolution; fallback to 16:9 if no projector

### 9.5 Admin Controls Overlay (Playing Now View)
- Position: Top-left corner
- Size: Compact, non-intrusive
- Controls (in order):
  - ◀ Previous verse (disabled when verses off or at first verse)
  - ▶ Next verse (disabled when verses off or at last verse)
  - 📖 Toggle verses enabled
  - 🎸/🎤 Toggle lyrics/chords mode for viewers
  - Verse indicator: `N/M` (only when verses enabled)
  - ⬇ Transpose down
  - `N` Current offset (-6 to +6)
  - ⬆ Transpose up
  - 📡 Push key to all viewers (sync)

### 9.6 Keyboard Shortcuts
| Key | Action |
|-----|--------|
| Arrow Down / Page Down | Next verse |
| Arrow Up / Page Up | Previous verse |
| (These work globally when admin is logged in, regardless of focused element) |

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

#### Global Endpoints (Not Room-Scoped)

##### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/auth/me` | — | Check current auth status |
| `POST` | `/api/auth/logout` | Admin | Admin logout → clears cookie |

##### Songs (Global Catalog)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/songs` | — | List all songs (excludes private for non-admin) |
| `GET` | `/api/songs/:id` | — | Get single song metadata (includes composers, lyricists, translators) |
| `GET` | `/api/songs/:id/lyrics` | — | Fetch, parse, cache, return structured lyrics |
| `POST` | `/api/songs/reload` | Admin | Re-fetch songs.json from Git, update cache (any admin) |

#### Room-Scoped Endpoints

All room-scoped endpoints include `:username` parameter to identify the room.
A middleware resolves the username to `admin_id` and attaches room context to the request.
Invalid/inactive usernames return 404.

##### Room Info
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/rooms/:username` | — | Get room info (adminId, displayName, username) |

##### Room Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/rooms/:username/auth/login` | — | Login to specific room (validates username matches URL) |

##### Room Queue
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/rooms/:username/queue` | Owner | Get room's queue (grouped, sorted) |
| `GET` | `/api/rooms/:username/queue/mine` | — | Get own queue entries in room |
| `POST` | `/api/rooms/:username/queue` | — | Add to room's queue (broadcasts `queue:updated`) |
| `DELETE` | `/api/rooms/:username/queue/:id` | — | Remove own entry from room (broadcasts `queue:updated`) |
| `POST` | `/api/rooms/:username/queue/:id/present` | Owner | Present song from room's queue (broadcasts `song:changed` + `queue:updated`) |
| `DELETE` | `/api/rooms/:username/queue/:id/admin` | Owner | Delete any queue entry in room (broadcasts `queue:updated`) |
| `DELETE` | `/api/rooms/:username/queue/group` | Owner | Delete group by sessionId + requesterName (broadcasts `queue:updated`) |
| `DELETE` | `/api/rooms/:username/queue` | Owner | Truncate room's queue + clear song (broadcasts `queue:updated` + `song:cleared`) |

##### Room Playing State
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/rooms/:username/state` | — | Get room's playing state (songId, verse, key, mode, versesEnabled, pendingSongIds, playedSongIds) |
| `POST` | `/api/rooms/:username/state/song` | Owner | Set room's current song (broadcasts `song:changed`) |
| `DELETE` | `/api/rooms/:username/state/song` | Owner | Clear room's current song (broadcasts `song:cleared`) |
| `POST` | `/api/rooms/:username/state/verse` | Owner | Set room's specific verse (broadcasts `verse:changed`) |
| `POST` | `/api/rooms/:username/state/verse/next` | Owner | Advance to next verse (broadcasts `verse:changed`) |
| `POST` | `/api/rooms/:username/state/verse/prev` | Owner | Go to previous verse (broadcasts `verse:changed`) |
| `POST` | `/api/rooms/:username/state/key/sync` | Owner | Push key to room's viewers (broadcasts `key:sync`) |
| `POST` | `/api/rooms/:username/state/mode` | Owner | Set room's display mode (broadcasts `mode:changed`) |
| `POST` | `/api/rooms/:username/state/verses/toggle` | Owner | Toggle room's verses enabled (broadcasts `verses:toggled`) |

##### Room Projector
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/rooms/:username/projector/register` | — | Register projector resolution for room (broadcasts `projector:resolution` if first) |

**Authorization:**
- "Owner" = Authenticated admin whose username matches the `:username` parameter
- Attempting to mutate another admin's room returns 403 Forbidden

### 11.2 WebSocket Events
See Section 6.3 for complete event documentation.

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
│   │   │   ├── AuthContext.tsx       # Admin auth state + room ownership
│   │   │   ├── SocketContext.tsx     # Socket.io instance (room-scoped)
│   │   │   ├── RoomContext.tsx       # Current room context (adminId, displayName)
│   │   │   └── PlayingNowContext.tsx # Current song state (room-scoped)
│   │   ├── services/
│   │   │   ├── api.ts                # REST API client
│   │   │   ├── transpose.ts          # Client-side chord transposition
│   │   │   └── chordDisplay.ts       # Chord display formatting (o→° conversion)
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
- [x] Create LyricsDisplay component (monospace, exact spacing)
- [x] Apply color coding (blue chords, green directives, red cues)
- [x] Build SearchView with filtering
- [x] Implement dynamic font sizing (auto-shrink to fit screen)

### Phase 3: Transposition ✅ (except token-based alignment)
- [x] **Backend: Chord parsing enhancements**
  - [x] Add `°` (degree symbol) as alternative diminished notation in chord regex
  - [ ] Extend `ParsedLine` type for chord lines to include parsed tokens with positions (for future token-based rendering)
- [x] **Frontend: Transposition service** (`services/transpose.ts`)
  - [x] Implement `parseChord(chord: string)` → `{ root, accidental, modifiers, bass }`
  - [x] Implement `transposeChord(chord: string, semitones: number)` → transposed chord string
  - [x] Implement `transposeChordLine(line: string, semitones: number)` → transposed line
  - [x] Handle `o` → `°` display conversion for diminished chords
  - [x] Enharmonic handling: original preserved at offset=0, preferred used for new accidentals
  - [x] Comprehensive unit tests (`services/transpose.test.ts`)
- [x] **Frontend: TransposeControls component**
  - [x] Build `[ ⬇ ] N [ ⬆ ]` UI with offset display (-6 to +6)
  - [x] Admin version: includes `📡` sync button
  - [x] Viewer version: no sync button, only visible in chords mode
  - [x] Out-of-sync indicator (●) when viewer differs from admin
- [x] **Frontend: State management** (PlayingNowContext)
  - [x] Add `viewerKeyOverride` state (viewer's local key offset)
  - [x] Admin key changes are local-only (no server call)
  - [x] Listen for `key:sync` event to sync viewer to admin's key
- [x] **Backend: Sync endpoint**
  - [x] Add `POST /api/rooms/:username/state/key/sync` endpoint (receives admin's key, broadcasts to room viewers)
  - [x] Broadcasts `key:sync` event to all clients
- [x] **Integration**
  - [x] Apply transposition to chord lines in PlayingNowView
  - [x] Apply transposition to chord lines in SongView
- [ ] **Future: Token-based chord alignment** (deferred)
  - [ ] Parse chord positions relative to character index
  - [ ] Render chords anchored to syllable positions in lyric line below
  - [ ] Enable proportional fonts for lyrics while maintaining alignment

### Phase 4: Playing Now (Real-time) ✅
- [x] Set up Socket.io rooms (playing-now, admin)
- [x] Implement song:changed broadcast
- [x] Build PlayingNowView with live updates
- [x] Create admin controls overlay (verse nav, mode toggles)
- [x] Build idle/splash screen for no-song state
- [x] Implement keyboard shortcuts for verse navigation (Arrow Up/Down, Page Up/Down)

### Phase 5: Verse System ✅
- [x] Implement verse calculation algorithm (frontend-only, see `utils/verseCalculator.ts`)
- [x] Build projector registration flow
- [x] Create client-side lines-per-verse measurement
- [x] Implement verse:next/prev events
- [x] Add verse mode toggle (admin controls viewers, viewers can override)
- [x] Admin always sees chords with purple highlight overlay when verses+lyrics mode
- [x] Viewer 3 modes: chords / full lyrics / single verse
- [x] Click-to-navigate on verse lines (admin only)
- [x] See `VERSES.md` for detailed specification

### Phase 6: Projection Mode ✅
- [x] Implement lyrics-only display mode
- [x] Add background image system:
  - [x] Dynamic discovery of images via Vite's `import.meta.glob`
  - [x] Random selection per song (avoids repeats)
  - [x] Browser preloading/caching on app startup
- [x] Create semi-transparent overlays for text contrast (pastoral style)
- [x] Build responsive layout for projector (multi-column, max 5 columns)
- [x] Handle font auto-sizing (dynamic sizing algorithm measuring actual text spans)
- [x] Fullscreen mode for viewers:
  - [x] Fullscreen button (⤢) in lyrics mode
  - [x] Song metadata header (title, artist, credits) in fullscreen
  - [x] Uses browser Fullscreen API with Escape to exit

### Phase 7: Queue System (partial)
- [x] Implement queue database operations
- [ ] Build "Add to Queue" flow (name prompt, confirmation)
- [x] Create QueueView for admin (grouped display)
- [x] Implement "Present from Queue" action
- [x] Real-time queue updates (broadcasts to admin when viewers add/remove songs)
- [x] Admin group deletion (by sessionId + requesterName)
- [ ] Add fairness logic (group moves to bottom after presentation)
- [ ] Build viewer's "my requests" view with cancel option

### Phase 8: Polish & Edge Cases (partial)
- [x] Add loading states and spinners
- [ ] Implement error boundaries and error messages
- [x] RTL styling refinements across all views
- [x] Sticky search bar with clear button
- [x] Song credits display (composer, lyricist, translator from database)
- [x] REST + Broadcast architecture for admin controls
- [x] Song status colors in search view (playing/pending/played)
- [ ] Mobile responsiveness improvements
- [x] Connection status indicators
- [ ] Final UI/UX polish (theme, logo integration)

### Phase 9: Production Database Setup ✅
The database layer uses LibSQL (via `@libsql/client`), which supports both local SQLite files and remote Turso databases.

**Two Deployment Options:**

#### Option A: Turso (Recommended for Production)
- Database hosted on Turso's edge network
- Remote access via web dashboard and CLI
- No volume management needed
- Automatic backups and replication

**Configuration:**
```env
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

#### Option B: Local SQLite (Development)
- SQLite file on local filesystem
- Fast, zero-latency queries
- No external dependencies

**Configuration:**
```env
DATABASE_PATH=./database/singalong.db
```

**Note:** If both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set, Turso is used. Otherwise, falls back to local SQLite at `DATABASE_PATH`.

---

## 15. Configuration & Environment Variables

### Backend (.env)
```env
# Server
PORT=3001
HOST=0.0.0.0

# Database (local SQLite - for development)
DATABASE_PATH=./database/singalong.db

# Database (Turso - for production/serverless)
# TURSO_DATABASE_URL=libsql://your-db-name.turso.io
# TURSO_AUTH_TOKEN=your-auth-token

# Authentication - REQUIRED, no default fallback
# Generate with: openssl rand -hex 32
COOKIE_SECRET=your-cookie-secret-here

# Songs - fetched from Git URL on startup, refreshed via admin action
SONGS_JSON_URL=https://raw.githubusercontent.com/.../songs.json

# Admin users - seeded on startup (format: user1:pass1,user2:pass2)
# Each user creates one room accessible at /:username/
ADMIN_USERS=alon:password1,iris:password2

# Multi-tenant settings
DEFAULT_ROOM=alon  # Room to redirect to when accessing / or /admin

# Cookie settings for browser compatibility
# Set to 'true' only if frontend and backend are on different domains (cross-origin)
# When false (default): Uses sameSite='lax' which is more compatible with older browsers
# When true: Uses sameSite='none' + secure=true (requires HTTPS)
# CROSS_ORIGIN_COOKIES=true

# Database reset (use with caution)
# RESET_DB=true     - Reset if DB is empty
# RESET_DB=CONFIRM  - Force reset even if DB has data (DELETES ALL DATA)
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_DEFAULT_ROOM=alon  # Room to redirect to when accessing / or /admin
```

---

## 16. Testing Considerations

### Manual Testing Checklist
- [ ] Room owner can log in to their room and see all songs (including private)
- [ ] Login to wrong room (different username in URL) fails
- [ ] Viewer cannot see private songs in search
- [ ] Song lyrics display correctly with proper chord alignment
- [ ] Hebrew songs display RTL correctly
- [ ] Transposition works for all chord types (Am, G7, Cmaj7, F#dim, B°7, A/C#, etc.)
- [ ] Diminished chords display with ° symbol (not lowercase o)
- [ ] Room owner sync button pushes key to all viewers in that room
- [ ] Viewer out-of-sync indicator appears when different from room owner
- [ ] Playing Now syncs across multiple browser tabs/devices in same room
- [x] Verse navigation works with keyboard shortcuts (↑/↓, PgUp/PgDn)
- [ ] Queue grouping and fairness logic works correctly
- [ ] Projector mode calculates verses based on screen size
- [ ] Background images display properly in lyrics-only mode
- [ ] Any admin's "Reload Songs" button refreshes song list from Git

### Multi-Tenant Testing
- [ ] Different rooms operate independently (song changes don't affect other rooms)
- [ ] Navigating to invalid room shows "Room not found" immediately
- [ ] Room display name shows correctly in header
- [ ] Viewer mode vs admin mode switches correctly based on URL
- [ ] Room-scoped session IDs (same viewer in different rooms = different sessions)
- [ ] Queue is isolated per room

### Edge Cases to Test
- Very long songs (font auto-shrinking)
- Songs with unusual chord notations (°, o, +, sus, add, etc.)
- Songs with only Hebrew or only English
- Empty queue states
- Multiple viewers with same name in same room
- Multiple viewers with same name in different rooms
- Rapid verse navigation
- Network disconnection and reconnection
- Transposition at boundary values (-6, +6)
- Chords with bass notes (A/C# transposed)
- Viewer override vs admin sync interaction

---

## 17. Analytics

### 17.1 Overview

The application tracks song-related events to enable offline analysis of sing-along sessions. Analytics are collected in a fire-and-forget manner — failures are logged but never crash the application or block user actions.

### 17.2 Tracked Events

| Action | Trigger | Description |
|--------|---------|-------------|
| `queued` | `search` | Viewer added a song to the queue from search results |
| `queued` | `song_view` | Viewer added a song to the queue from single-song page |
| `played` | `search` | Admin played directly from search (no viewer credit) |
| `played` | `song_view` | Admin played from single-song "Present Now" (no viewer credit) |
| `played` | `queue` | Admin played from queue (viewer who requested gets credit) |
| `removed_by_viewer` | `queue` | Viewer cancelled their own request (future feature) |
| `removed_by_admin` | `queue` | Admin deleted a queue entry |

### 17.3 Event Sessions

Analytics are grouped by **event_id** — a UUID that represents a single sing-along session. A new event starts when the admin truncates the queue. This allows analysis per event (e.g., "which songs were played at Saturday's session").

### 17.4 Viewer Attribution

- When a song is played from the queue, the **viewer who requested it** gets credit (their name and session ID are recorded)
- When a song is played directly by admin (from search or song view), **no viewer** is credited
- This distinction enables metrics like "queue vs. direct play ratio" and "which viewers got to sing the most"

### 17.5 Derivable Metrics

With the tracked data, you can calculate:

| Metric | How |
|--------|-----|
| Most popular songs (global) | Count plays per song across all rooms |
| Most popular songs (per room) | Count plays per song filtered by room |
| Queue vs. direct play ratio | Compare plays with `trigger='queue'` vs other triggers |
| Top viewers per event | Count plays with viewer credit, grouped by event |
| Request success rate | Ratio of `queued` to `played` (from queue) per song |
| Songs that get removed often | Count `removed_by_admin` actions per song |

---

## 18. Future Considerations (Out of Scope for V1)

1. **Song caching**: Pre-download all songs for offline resilience
2. **Setlist feature**: Pre-plan song order for a show
3. **Song editing UI**: Admin interface to edit lyrics (currently Git-only)
4. **Analytics**: Track popular songs, frequent requesters per room
5. **Mixed-language songs**: Hebrew lyrics with English words
6. **Auto-scroll**: Automatically advance verses on a timer
7. **Song categories/filtering**: Filter by category in search
8. **Favorites**: Let viewers mark favorite songs
9. **History**: Show recently played songs per room
10. **Custom domains**: Allow rooms to have custom subdomains (e.g., alon.singalong.com)
11. **Per-room song catalogs**: Allow admins to curate their own song lists
12. **Room display name editing UI**: Allow admins to change their room's display name

---

## 19. Visual Reference

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
| Continuation arrows (`--->`, `-->`, `<---`, `<--`) | Blue |
| Background (chords mode) | White |
| Background (projection) | Image + dark overlay |

### Song Status Colors (Search View)
| Status | Background Color | Hex Code |
|--------|------------------|----------|
| Currently playing | Light green | `#d4edda` |
| In queue (pending) | Light yellow | `#fff9c4` |
| Already played | Light grey | `#e9ecef` |
| No status | White | `#ffffff` |


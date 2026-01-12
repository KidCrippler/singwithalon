# SingWithAlon - Claude Code Guide

## Project Overview

SingWithAlon is a real-time multi-tenant web application for managing sing-along events and band performances. Each admin owns one room with isolated playing state, queue, and viewers.

**Primary Documentation**: See [SPEC.md](./SPEC.md) for comprehensive technical specification.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Backend** | Node.js + Fastify | REST API server |
| **Frontend** | React + Vite + TypeScript | SPA with real-time updates |
| **Real-time** | Socket.io | WebSocket broadcasts per room |
| **Database** | LibSQL/Turso | SQLite-compatible (local dev, Turso prod) |
| **Song Storage** | Git + JSON | External song index + markup files |

---

## Architecture Patterns

### Multi-Tenant Room System

Every endpoint and socket event is **room-scoped** via `:username` parameter:
- URL structure: `/:username/` (viewer), `/:username/admin` (admin)
- Database: All state tables have `admin_id` foreign key
- Socket.io: Rooms namespaced as `room:{adminId}:viewers`, `room:{adminId}:admin`

**Key principle**: Rooms are completely isolated - changes in one room never affect another.

### REST + Broadcast Pattern

- **Client → Server**: Use REST API (immediate response, HTTP status codes)
- **Server → Clients**: Broadcast via Socket.io to all room members
- **No duplicate logic**: REST endpoints handle mutations and broadcast socket events

Example flow:
```
Admin clicks "Next Verse"
  ↓ POST /api/rooms/:username/state/verse/next
Server updates DB
  ↓ Broadcast "verse:changed" event
All viewers in room receive update
```

### Song Data Flow

```
Server Startup → Fetch songs.json from Git URL → Store in memory
                                                 ↓
Admin clicks "Reload Songs" → Re-fetch songs.json → Update cache → Broadcast
                                                 ↓
Client requests song lyrics → Server checks cache → Fetch markup file if stale
                           → Parse (chords, RTL, verses) → Cache → Return JSON
```

---

## Key Features

### 1. RTL/LTR Language Support

- **Auto-detection**: Hebrew Unicode characters (`\u0590-\u05FF`) trigger RTL mode
- **Manual override**: JSON `direction` field overrides auto-detection
- **Chord line reversal**: Hebrew songs reverse chord lines server-side for proper RTL display
- **CSS handling**: `direction: ltr` with `text-align: right` for RTL chord alignment

### 2. Real-Time Transposition

- **Client-side only**: No server involvement for key changes
- **Admin global key**: Stored in DB, broadcast to viewers via `key:sync`
- **Viewer override**: Absolute offset (-6 to +6), independent from admin
- **Enharmonic handling**: Original notation preserved at offset=0, preferred spellings for new accidentals

### 3. Verse System

- **Client-side calculation**: See `frontend/src/utils/verseCalculator.ts`
- **Projector-driven**: First projector to connect sets room's `linesPerVerse`
- **Line counting**: Only lyric lines count (not chord-only lines or directives)
- **Admin controls**: Navigate verses via keyboard (↑/↓, PgUp/PgDn) or overlay buttons

### 4. Queue System

- **Viewer requests**: Max 50 songs per session
- **Grouped display**: By requester name + session ID
- **Fairness mechanism**: Group moves to bottom after presentation
- **Real-time updates**: WebSocket broadcasts on queue changes

---

## File Structure

```
platform/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Fastify + Socket.io setup
│   │   ├── routes/               # REST API endpoints
│   │   ├── services/             # Song parser, chord detector, verse calculator
│   │   ├── socket/               # Socket.io handlers
│   │   └── db/                   # Database schema + queries
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── views/            # SearchView, PlayingNowView, QueueView
│   │   │   ├── song/             # LyricsDisplay, ChordLine, TransposeControls
│   │   │   └── admin/            # AdminControls, QueueGroup
│   │   ├── hooks/                # useSocket, useSong, useAuth, usePlayingNow
│   │   ├── context/              # AuthContext, SocketContext, RoomContext
│   │   ├── services/             # API client, transpose, chordDisplay
│   │   └── utils/                # verseCalculator, rtl, formatting
│   └── public/
│       └── backgrounds/          # Projection mode background images
│
├── database/
│   └── singalong.db              # SQLite database (gitignored)
│
└── SPEC.md                       # Complete technical specification
```

---

## Development Workflows

### Working with Songs

**Song markup format**:
- Line 1: `Song Title - Artist`
- Line 2+: Credits (metadata)
- Chord lines: Detected by regex (all tokens match chord pattern)
- Markers: `{...}` directives, `[...]` cues, `--->` continuation arrows

**Chord detection regex**:
```
[A-G][#b]?(m|min|Min|M|maj|Maj|dim|aug|add|o|°|º|\+)?[0-9]*\+?(sus[24]?)?(b[0-9]+)?(\/[A-G][#b]?)?!?
```

**Adding new songs**:
1. Add entry to `songs.json` in Git repo
2. Create markup `.txt` file at `markupUrl`
3. Admin clicks "Reload Songs" button
4. Server fetches updated `songs.json`, updates cache

### Testing Multi-Tenant Isolation

**Critical test cases**:
- Open two rooms in separate tabs - changes in room A don't affect room B
- Same viewer name in different rooms creates separate sessions
- Queue entries are isolated per room
- Projector resolution is per-room (not global)

### Debugging Socket Events

**Enable Socket.io debug logs**:
```bash
# Backend
DEBUG=socket.io:* npm run dev

# Frontend
localStorage.debug = 'socket.io-client:*'
```

**Key events to monitor**:
- `join:room` - Client joins room namespace
- `song:changed` - Admin changes current song
- `verse:changed` - Admin navigates verses
- `queue:updated` - Viewer adds/removes song from queue

---

## Common Tasks

### Add New REST Endpoint

1. **Create route handler** in `backend/src/routes/`
2. **Add room middleware** to resolve `:username` → `admin_id`
3. **Update playing_state or queue** in database
4. **Broadcast socket event** to room namespace
5. **Update frontend API client** in `frontend/src/services/api.ts`

Example:
```typescript
// backend/src/routes/state.ts
fastify.post('/api/rooms/:username/state/mode', async (req, reply) => {
  const { adminId } = req.room; // from middleware
  const { displayMode } = req.body;

  await db.updatePlayingState(adminId, { displayMode });

  // Broadcast to all viewers in room
  io.to(`room:${adminId}:viewers`).emit('mode:changed', { displayMode });

  return { success: true };
});
```

### Add New Socket Event

1. **Define event in socket/handlers.ts**
2. **Add to room namespace** (not global)
3. **Update frontend useSocket hook**
4. **Handle in relevant component**

### Add New Song Marker Type

1. **Update chord detection regex** in `backend/src/services/chordDetector.ts`
2. **Add parsing logic** in `backend/src/services/songParser.ts`
3. **Add styling** in `frontend/src/components/song/ChordLine.tsx` or `LyricLine.tsx`
4. **Update SPEC.md** documentation

---

## Configuration

### Backend Environment Variables

```env
# Server
PORT=3001
HOST=0.0.0.0

# Database (choose one)
DATABASE_PATH=./database/singalong.db          # Local SQLite
# TURSO_DATABASE_URL=libsql://...             # Turso cloud
# TURSO_AUTH_TOKEN=...

# Authentication
COOKIE_SECRET=<generate with: openssl rand -hex 32>

# Songs
SONGS_JSON_URL=https://raw.githubusercontent.com/.../songs.json

# Admin users (format: user1:pass1,user2:pass2)
ADMIN_USERS=alon:password1,iris:password2

# Default room for / redirect
DEFAULT_ROOM=alon
```

### Frontend Environment Variables

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_DEFAULT_ROOM=alon
```

---

## Testing Checklist

### Multi-Tenant Isolation
- [ ] Different rooms operate independently
- [ ] Invalid room shows "Room not found"
- [ ] Room display name shows correctly
- [ ] Session IDs are room-specific

### Song Display
- [ ] Hebrew songs display RTL correctly
- [ ] Chord alignment preserved with exact spacing
- [ ] Transposition works for all chord types (Am, G7, F#dim, B°7, etc.)
- [ ] Diminished chords display with ° symbol

### Real-Time Sync
- [ ] Playing Now syncs across tabs/devices in same room
- [ ] Verse navigation via keyboard shortcuts works
- [ ] Admin sync button pushes key to all viewers
- [ ] Out-of-sync indicator appears when viewer differs from admin

### Queue System
- [ ] Grouping by requester + session works
- [ ] Fairness logic (group moves to bottom after presentation)
- [ ] Real-time updates when viewers add/remove songs
- [ ] Max 50 songs per viewer enforced

### Projection Mode
- [ ] Background images display properly
- [ ] Font auto-sizing fits content
- [ ] Fullscreen mode works (⤢ button)
- [ ] Song metadata header visible in fullscreen

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `markupUrl` fetch fails | Log error, return "Song unavailable" |
| Invalid song JSON entry | Log warning, skip entry, continue |
| WebSocket disconnect | Auto-reconnect (Socket.io built-in) |
| Admin session expired | Redirect to login |
| Queue limit reached | Show error, prevent adding |
| Invalid chord in transposition | Keep original, log warning |

---

## Performance Considerations

### Song Caching Strategy
- **In-memory cache**: Parsed song data cached by song ID
- **Lazy invalidation**: Compare `dateModified` on each request
- **Cache loss**: Acceptable on server restart (refetch from Git)

### Font Auto-Sizing
- **Binary search algorithm**: Finds optimal font size efficiently
- **Measures actual text spans**: Not wrapper elements (more accurate)
- **Separate for lyrics vs chords**: Different sizing strategies

### Background Image Preloading
- **Preload on app startup**: All images in `/public/backgrounds/`
- **Browser caching**: Ensures instant switching
- **Random selection**: Avoids repeats, keeps experience fresh

---

## Future Enhancements (Out of Scope V1)

1. **Song caching**: Pre-download all songs for offline resilience
2. **Setlist feature**: Pre-plan song order for shows
3. **Song editing UI**: Admin interface to edit lyrics (currently Git-only)
4. **Analytics**: Track popular songs, frequent requesters per room
5. **Mixed-language songs**: Hebrew lyrics with English words
6. **Auto-scroll**: Automatically advance verses on timer
7. **Custom domains**: Room-specific subdomains (e.g., alon.singalong.com)

---

## Additional Documentation

- **[SPEC.md](./SPEC.md)** - Complete technical specification (1,400+ lines)
- **[VERSES.md](./VERSES.md)** - Detailed verse calculation implementation *(if exists)*
- **[README.md](./README.md)** - Setup and running instructions

---

## Getting Help

When asking Claude Code for help:
- **Reference SPEC.md sections** for detailed behavior
- **Specify room context** when debugging multi-tenant issues
- **Include socket event names** when debugging real-time sync
- **Mention language (Hebrew/English)** when debugging RTL issues
- **Provide chord examples** when debugging transposition

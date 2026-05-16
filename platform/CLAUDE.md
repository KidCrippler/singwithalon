# SingWithAlon - Claude Code Guide

Real-time multi-tenant sing-along web app. Each admin owns one room with isolated playing state, queue, playlists, and viewers.

**Full spec**: [SPEC.md](./SPEC.md) — read specific sections on demand, not all at once.

---

## Tech Stack

Backend: Node.js + Fastify + Socket.io + LibSQL/Turso  
Frontend: React + Vite + TypeScript  
Songs: JSON index + text markup files fetched from Git

---

## Key Conventions

- **Room-scoped everything**: URLs use `/:username/`, DB tables have `admin_id` FK, sockets use `room:{adminId}:*` namespaces
- **REST + Broadcast**: Mutations via REST → server broadcasts socket events → all clients update
- **RTL-first UI**: Default direction is RTL (Hebrew). Auto-detect via Unicode, override via JSON `direction` field
- **Transposition is client-side**: Server stores/broadcasts key offset, clients render transposed chords locally
- **Verse calculation is frontend-only**: See `frontend/src/utils/verseCalculator.ts`

---

## File Structure

```
platform/
├── backend/src/
│   ├── index.ts          # Fastify + Socket.io setup
│   ├── config.ts         # Env var parsing
│   ├── routes/           # auth, songs, queue, state, playlist
│   ├── services/         # songParser, chordDetector, analytics
│   ├── socket/           # Socket.io handlers + broadcast helpers
│   └── db/               # schema.sql, queries (index.ts)
├── frontend/src/
│   ├── components/views/ # SearchView, PlayingNowView, QueueView, PlaylistView
│   ├── context/          # Auth, Socket, Room, PlayingNow, Songs, Queue, Search
│   ├── services/api.ts   # All REST API calls
│   ├── hooks/            # useKeyboardShortcuts, useDynamicFontSize
│   └── utils/            # verseCalculator, backgrounds, transpose
├── tools/
│   └── playlist-builder.html  # Standalone playlist env var builder
└── SPEC.md               # Complete technical specification
```

---

## SPEC.md Section Index

| Section | Topic |
|---------|-------|
| 1-2 | Overview, tech stack |
| 3 | User roles, URL structure, auth |
| 4 | Views/screens (Search, Presentation, PlayingNow, Queue, Admin nav) |
| 5 | Data model (song JSON, markup format, parsing rules, DB schema) |
| 6 | Real-time architecture (Socket.io rooms, events) |
| 7 | Transposition logic |
| 8 | Verse calculation |
| 9 | UI/UX design |
| 10 | Song data loading & caching |
| 11 | API endpoints (full REST reference) |
| 12 | Error handling |
| 13 | Project file structure |
| 14 | Implementation phases |
| 15 | Configuration & env vars |
| 16 | Testing considerations |
| 17 | Analytics |
| 18 | Playlists |
| 19 | Future considerations |
| 20 | Visual reference |

---

## Common Patterns

**New REST endpoint**: route handler → room middleware → DB mutation → `broadcastToRoom()` → update `frontend/src/services/api.ts`

**New socket event**: define in `socket/handlers.ts` → broadcast to room namespace → listen in relevant Context → update component

**Chord detection regex** (SPEC.md §5.2):
```
[A-G][#b]?(m|min|Min|M|maj|Maj|dim|aug|add|o|°|º|\+)?[0-9]*\+?(sus[24]?)?(b[0-9]+)?(\/[A-G][#b]?)?!?
```

---

## Environment Variables

Backend `.env`:
```
PORT, HOST, DATABASE_PATH, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN,
COOKIE_SECRET, SONGS_JSON_URL, ADMIN_USERS, PLAYLISTS, DEFAULT_ROOM
```

Frontend `.env`:
```
VITE_API_URL, VITE_SOCKET_URL, VITE_DEFAULT_ROOM
```

See SPEC.md §15 for full details and formats.

---

## Debugging

```bash
# Socket.io server logs
DEBUG=socket.io:* npm run dev

# Socket.io client logs
localStorage.debug = 'socket.io-client:*'
```

Local DB: `sqlite3 platform/backend/database/singalong.db`

# Multi-Tenant Migration Plan: User-as-Room Architecture

## Overview

This document outlines the migration from single-tenant to multi-tenant architecture using the **User-as-Room** model, where each admin user represents an isolated sing-along room.

### Mental Model

```
Current (Single-Tenant):
  One deployment = One room = One admin controls everything

Target (Multi-Tenant):
  One deployment = Many rooms = Each admin owns their isolated room
```

This is conceptually equivalent to deploying separate instances per user, but within a single deployment with database-level isolation.

---

## Finalized Design Decisions

### Core Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Room model | User = Room | No separate "events" entity. Each admin user owns one room. |
| Co-admins | Not supported | Room owners share credentials or pass device if needed. |
| Room discovery | Direct link only | No public listing. Admins can purchase custom domains if desired. |
| Expected scale | <10 rooms | Small scale, simple infrastructure sufficient. |
| Admin provisioning | Environment variable | `ADMIN_USERS=alon:pass1,iris:pass2` — requires redeploy to add users. |

### Database & IDs

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Foreign key type | Numeric `id` (auto-increment) | Standard practice. Username for URLs, ID for FKs. |
| Session model | One session per room | Unique session ID generated per room visit. Same browser visiting two rooms = two independent sessions. |
| Admin deletion | Soft delete | Mark `is_active = false`, keep data, room becomes inaccessible. Manual reactivation via DB. |
| Room display name | New `display_name` field | Shows in UI (e.g., "שרים עם אלון"). Username stays in URL. |

### Songs & Content

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Song catalog | Global (shared) | All rooms share the same song library. |
| Private songs | Global | `isPrivate` in songs.json hides from all viewers, visible to all admins. |
| Projector resolution | Per-room, first wins | First projector to connect in each room sets resolution for that room. |

### Routing & URLs

| Decision | Choice | Rationale |
|----------|--------|-----------|
| URL scheme | Path-based | `/:username/...` — simpler than subdomains, no DNS/SSL changes. |
| Default room | `/alon` | Root `/` redirects to `/alon`, `/admin` redirects to `/alon/admin`. |
| Old bookmarks | Break them | No need for backwards compatibility redirects. |

### Authentication

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Login scope | Strict (room-specific) | Login at `/iris/admin` only accepts `iris` credentials. Wrong username = "Invalid credentials for this room". |
| Viewer auth | Anonymous | No accounts required. Identified by session + requester name. |

### Migration Strategy

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data preservation | Not needed | Existing data can be discarded. Clean slate migration. |
| Migration method | `RESET_DB` env var | Drop all tables, create fresh schema, seed admins. |

---

## Phase 1: Database Schema

### Target Schema (Multi-Tenant)

```sql
-- Admins table (represents "rooms", with soft delete and display name)
CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Per-room playing state
CREATE TABLE playing_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL UNIQUE REFERENCES admins(id) ON DELETE CASCADE,
  current_song_id INTEGER,
  current_verse_index INTEGER DEFAULT 0,
  current_key_offset INTEGER DEFAULT 0,
  display_mode TEXT DEFAULT 'lyrics',
  verses_enabled INTEGER DEFAULT 1,
  projector_width INTEGER,
  projector_height INTEGER,
  projector_lines_per_verse INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Per-room queue
CREATE TABLE queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL,
  requester_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  played_at DATETIME
);

-- Per-room viewer sessions
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  requester_name TEXT,
  is_projector BOOLEAN DEFAULT FALSE,
  resolution_width INTEGER,
  resolution_height INTEGER,
  lines_per_verse INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_playing_state_admin ON playing_state(admin_id);
CREATE INDEX idx_queue_admin ON queue(admin_id);
CREATE INDEX idx_sessions_admin ON sessions(admin_id);
CREATE INDEX idx_admins_active ON admins(is_active);
```

---

## Phase 2: Backend Changes

### 2.1 Database Initialization with RESET_DB

On server startup, the database initialization logic:

```
1. If RESET_DB === 'true':
   - Check if any table has data
   - If yes: Log error "RESET_DB=true but database has data. Set RESET_DB=CONFIRM to proceed."
   - Exit with error

2. If RESET_DB === 'CONFIRM':
   - Log "RESET_DB=CONFIRM - recreating database schema..."
   - DROP TABLE IF EXISTS sessions, queue, playing_state, admins (in order)
   - CREATE all tables with new schema
   - Log "Database schema created."

3. Always (after schema exists):
   - Sync admins from ADMIN_USERS env var (upsert)
   - For each admin without a playing_state row, create one
   - Set default display_name if not set
```

### 2.2 Route Structure

#### New Routes (Room-Scoped)

```
# Room-scoped state routes
GET   /api/rooms/:username/state
POST  /api/rooms/:username/state/song
DELETE /api/rooms/:username/state/song
POST  /api/rooms/:username/state/verse
POST  /api/rooms/:username/state/verse/next
POST  /api/rooms/:username/state/verse/prev
POST  /api/rooms/:username/state/key/sync
POST  /api/rooms/:username/state/mode
POST  /api/rooms/:username/state/verses/toggle

# Room-scoped queue routes
GET   /api/rooms/:username/queue
GET   /api/rooms/:username/queue/mine
POST  /api/rooms/:username/queue
DELETE /api/rooms/:username/queue/:id
POST  /api/rooms/:username/queue/:id/present
DELETE /api/rooms/:username/queue/:id/admin
DELETE /api/rooms/:username/queue/group
DELETE /api/rooms/:username/queue

# Room-scoped projector routes
POST  /api/rooms/:username/projector/register

# Global routes (unchanged)
GET   /api/songs
GET   /api/songs/:id
GET   /api/songs/:id/lyrics
POST  /api/songs/reload

# Auth routes (room-scoped login)
POST  /api/rooms/:username/auth/login   # Only accepts credentials for :username
POST  /api/auth/logout
GET   /api/auth/me
```

### 2.3 Room Resolution Middleware

```
Middleware: resolveRoom

1. Extract :username from URL params
2. Query: SELECT id, username, display_name, is_active FROM admins WHERE username = :username
3. If not found → 404 { error: "Room not found" }
4. If is_active = false → 404 { error: "Room not found" }
5. Attach to request: request.room = { adminId, username, displayName }
6. Continue to route handler
```

### 2.4 Room-Scoped Login (Strict)

```
POST /api/rooms/:username/auth/login

1. Extract :username from URL (not from body)
2. Extract { password } from body
3. Query: SELECT * FROM admins WHERE username = :username AND is_active = true
4. If not found → 404 { error: "Room not found" }
5. Verify password against password_hash
6. If mismatch → 401 { error: "Invalid credentials" }
7. Create session cookie with admin_id
8. Return { success: true, admin: { id, username, displayName } }
```

### 2.5 Authorization Middleware

```
Middleware: requireRoomOwner

1. Check if user is authenticated (has valid session cookie)
2. If not → 401 Unauthorized
3. Get logged-in admin's ID from session cookie
4. Compare with request.room.adminId
5. If mismatch → 403 { error: "Not authorized for this room" }
6. Continue to route handler
```

---

## Phase 3: Socket.io Changes

### Room Naming

```
Current:                    New (Per-Admin):
playing-now      →          room:{adminId}:viewers
admin            →          room:{adminId}:admin
projector        →          room:{adminId}:projectors
```

### Connection Flow

**Viewer:** Connect with `{ roomUsername }` → Server resolves to adminId → Join `room:{adminId}:viewers`

**Admin:** Connect with auth cookie + `{ roomUsername }` → Validate ownership → Join `room:{adminId}:viewers` + `room:{adminId}:admin`

**Projector:** Connect with `{ roomUsername, isProjector: true }` → Join `room:{adminId}:viewers` + `room:{adminId}:projectors`

### Broadcast Scoping

All broadcasts become room-scoped:
- `io.to('room:${adminId}:viewers').emit('song:changed', ...)`
- `io.to('room:${adminId}:admin').emit('queue:updated', ...)`

---

## Phase 4: Frontend Changes

### Routing

```
/                    → Redirect to /alon (default room)
/admin               → Redirect to /alon/admin (default admin entry)
/:username           → Search View for room (viewer entry)
/:username/admin     → Search View for room (admin entry, shows login)
/:username/song/:id  → Song View in room context
/:username/playing-now → Playing Now for room
/:username/queue     → Queue for room (admin only)
```

### New RoomContext

```typescript
interface RoomContextValue {
  roomUsername: string | null;
  roomAdminId: number | null;
  roomDisplayName: string | null;
  isRoomLoading: boolean;
  roomError: string | null;
  sessionId: string | null;  // Per-room, stored in localStorage
}
```

### Modified AuthContext

```typescript
interface AuthContextValue {
  isAdmin: boolean;
  adminId: number | null;
  adminUsername: string | null;
  isRoomOwner: boolean;  // true if adminUsername === roomUsername
  login: (password: string) => Promise<void>;  // username from URL
  logout: () => Promise<void>;
}
```

### Session Storage

Per-room session IDs in localStorage:
- `localStorage['singalong:session:alon']` = 'uuid-1'
- `localStorage['singalong:session:iris']` = 'uuid-2'

### UI Changes

- Header shows `room.displayName` instead of hardcoded text
- Login form shows password only (username displayed, not editable)

---

## Phase 5: Deployment

### Environment Variables

```env
# Existing (unchanged)
PORT=3001
HOST=0.0.0.0
DATABASE_PATH=./database/singalong.db
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
COOKIE_SECRET=...
SONGS_JSON_URL=https://...

# Multi-tenant
ADMIN_USERS=alon:password1,iris:password2
DEFAULT_ROOM=alon

# Migration (one-time)
RESET_DB=CONFIRM    # Remove after first successful deploy!
```

### Deployment Steps

```bash
# 1. Set environment variables:
RESET_DB=CONFIRM
ADMIN_USERS=alon:pass1,iris:pass2
DEFAULT_ROOM=alon

# 2. Deploy new backend + frontend

# 3. On startup, backend will:
#    - Drop all tables
#    - Create new schema
#    - Seed admins from ADMIN_USERS
#    - Create playing_state rows

# 4. Verify deployment works

# 5. IMPORTANT: Remove RESET_DB env var (or set to empty)
#    Future deploys will NOT reset the database
```

### Verification

```bash
# Test room access
curl https://your-domain.com/api/rooms/alon/state

# Test login (should succeed)
curl -X POST https://your-domain.com/api/rooms/alon/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "pass1"}'

# Test wrong credentials (should fail)
curl -X POST https://your-domain.com/api/rooms/iris/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "pass1"}'  # Wrong - this is alon's password
```

### Rollback

If something goes wrong:
1. Deploy previous version of backend/frontend
2. Database will be empty (old data was discarded)

---

## Phase 6: Admin Operations

### Adding a New Room

1. Add to `ADMIN_USERS`: `ADMIN_USERS=...,newuser:password`
2. Redeploy (do NOT set RESET_DB)
3. Backend syncs admins table, creates playing_state row

### Deactivating a Room (Soft Delete)

```sql
UPDATE admins SET is_active = false WHERE username = 'iris';
```

### Reactivating a Room

```sql
UPDATE admins SET is_active = true WHERE username = 'iris';
```

### Changing Display Name

```sql
UPDATE admins SET display_name = 'שרים עם איריס' WHERE username = 'iris';
```

### Deleting Permanently

```sql
DELETE FROM admins WHERE username = 'iris';
-- CASCADE deletes playing_state, queue, sessions
```

---

## Quick Reference

### Authorization Matrix

| Action | Viewer | Room Owner | Other Admin |
|--------|--------|------------|-------------|
| View room state | ✅ | ✅ | ✅ (as viewer) |
| Add to queue | ✅ | ✅ | ✅ (as viewer) |
| Change song | ❌ | ✅ | ❌ |
| Manage queue | ❌ | ✅ | ❌ |
| Control verses | ❌ | ✅ | ❌ |
| Login at room | ❌ | ✅ | ❌ |

### Socket.io Room Mapping

| User Type | Rooms Joined |
|-----------|-------------|
| Viewer in Alon's room | `room:1:viewers` |
| Alon (logged in) | `room:1:viewers`, `room:1:admin` |
| Projector in Alon's room | `room:1:viewers`, `room:1:projectors` |
| Iris in her own room | `room:2:viewers` (separate!) |

### RESET_DB Behavior

| RESET_DB Value | Database Has Data | Result |
|----------------|-------------------|--------|
| not set | any | Normal startup |
| `true` | empty | Reset database |
| `true` | has data | **Error, exit** (safety) |
| `CONFIRM` | any | Reset database (force) |

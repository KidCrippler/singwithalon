# Usage Guide

This guide covers how to build, run, and manage the SingWithAlon platform.

---

## Table of Contents

- [Building](#building)
- [Running](#running)
- [Testing](#testing)
- [Stopping Services](#stopping-services)
- [SQLite Database Queries](#sqlite-database-queries)
- [cURL API Examples](#curl-api-examples)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Common Workflows](#common-workflows)

---

## Building

### Backend

```bash
cd platform/backend

# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build
```

The compiled output goes to `backend/dist/`.

### Frontend

```bash
cd platform/frontend

# Install dependencies
npm install

# Build for production
npm run build
```

The compiled output goes to `frontend/dist/`.

---

## Running

### Development Mode (Hot Reload)

**Terminal 1 — Backend:**
```bash
cd platform/backend
npm run dev
```
Backend runs at: `http://localhost:3001`

**Terminal 2 — Frontend:**
```bash
cd platform/frontend
npm run dev
```
Frontend runs at: `http://localhost:5173`

### Production Mode

**Backend:**
```bash
cd platform/backend
npm run build
npm start
```

**Frontend (preview build):**
```bash
cd platform/frontend
npm run build
npm run preview
```

---

## Testing

### Backend Unit Tests

Run the chord validation test suite:
```bash
cd platform/backend
npm test
```

This runs tests for chord token validation including:
- Basic chords (Am, G7, Cmaj7, etc.)
- Accidentals (F#, Bb, F#m, etc.)
- Slash chords (A/C#, G/B, etc.)
- Bass-only notation (/F, /Bb, etc.)
- Bracketed chords ([Em], [Am7], etc.)
- Special markers (--->, -, x, digits)
- Invalid tokens (regular words, Hebrew text, etc.)

---

## Stopping Services

### Kill by Ctrl+C
If running in the foreground, press `Ctrl+C` in each terminal.

### Kill by Port

**Backend (port 3001):**
```bash
# Find the process
lsof -i :3001

# Kill it
kill -9 $(lsof -t -i :3001)
```

**Frontend (port 5173):**
```bash
# Find the process
lsof -i :5173

# Kill it
kill -9 $(lsof -t -i :5173)
```

### Kill All Node Processes (Nuclear Option)
```bash
killall node
```

---

## SQLite Database Queries

The SQLite database is located at:
- `platform/backend/database/singalong.db`
- Or: `platform/database/singalong.db`

### Open the Database

```bash
cd platform/backend
sqlite3 database/singalong.db
```

### Useful Queries

#### List All Tables
```sql
.tables
```

#### View Table Schema
```sql
.schema queue
.schema playing_state
.schema sessions
```

#### View Current Playing State
```sql
SELECT * FROM playing_state;
```

#### View All Queue Entries
```sql
SELECT 
  id, 
  song_id, 
  requester_name, 
  status, 
  datetime(created_at, 'localtime') as created
FROM queue
ORDER BY created_at;
```

#### View Pending Queue (Not Yet Played)
```sql
SELECT * FROM queue WHERE status = 'pending' ORDER BY created_at;
```

#### View Active Sessions
```sql
SELECT 
  session_id, 
  requester_name, 
  is_projector,
  datetime(last_seen, 'localtime') as last_seen
FROM sessions
ORDER BY last_seen DESC;
```

#### Clear the Queue
```sql
DELETE FROM queue;
```

#### Reset Playing State
```sql
UPDATE playing_state 
SET current_song_id = NULL, 
    current_verse_index = 0, 
    current_key_offset = 0, 
    display_mode = 'lyrics' 
WHERE id = 1;
```

#### Exit sqlite3
```sql
.quit
```

### One-liner Queries (From Shell)

```bash
# Check playing state
sqlite3 platform/backend/database/singalong.db "SELECT * FROM playing_state;"

# Count pending queue entries
sqlite3 platform/backend/database/singalong.db "SELECT COUNT(*) FROM queue WHERE status='pending';"

# List recent sessions
sqlite3 platform/backend/database/singalong.db "SELECT session_id, requester_name FROM sessions ORDER BY last_seen DESC LIMIT 10;"
```

---

## cURL API Examples

Base URL: `http://localhost:3001`

### Authentication

#### Login as Admin
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "********"}' \
  -c cookies.txt
```
This saves the session cookie to `cookies.txt` for subsequent requests.

#### Check Auth Status
```bash
curl http://localhost:3001/api/auth/me \
  -b cookies.txt
```

#### Logout
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt
```

### Songs

#### List All Songs
```bash
curl http://localhost:3001/api/songs
```

#### Get Song Metadata (by ID)
```bash
curl http://localhost:3001/api/songs/1
```

#### Get Parsed Song Lyrics
```bash
curl http://localhost:3001/api/songs/1/lyrics
```

#### Reload Songs from Source (Admin Only)
```bash
curl -X POST http://localhost:3001/api/songs/reload \
  -b cookies.txt
```

### Queue

#### View Queue (Admin Only)
```bash
curl http://localhost:3001/api/queue \
  -b cookies.txt
```

#### Add Song to Queue
```bash
curl -X POST http://localhost:3001/api/queue \
  -H "Content-Type: application/json" \
  -d '{"songId": 5, "requesterName": "John"}'
```

#### Remove from Queue
```bash
curl -X DELETE http://localhost:3001/api/queue/1
```

### Playing State

#### Get Current State
```bash
curl http://localhost:3001/api/state
```

### Pretty-Printed Output

Add `| jq` for formatted JSON (requires `jq` installed):

```bash
curl -s http://localhost:3001/api/songs | jq

curl -s http://localhost:3001/api/songs/1/lyrics | jq '.verses'
```

### Quick Health Check

```bash
curl -w "\nHTTP Status: %{http_code}\n" http://localhost:3001/api/state
```

---

## Environment Variables

### Backend (`platform/backend/.env`)

Copy `.env.example` to `.env` and configure:

```env
# Server
PORT=3001
HOST=0.0.0.0

# Database
DATABASE_PATH=./database/singalong.db

# Authentication (use a strong random secret in production)
COOKIE_SECRET=your-secret-here

# Songs source
SONGS_JSON_URL=https://raw.githubusercontent.com/YourOrg/songs/master/songs.json

# Admin users - seeded on startup (format: user1:pass1,user2:pass2)
ADMIN_USERS=admin:yourpassword,moti:motipass,iris:irispass

# Fallback admin password (only used if ADMIN_USERS is empty and no admins exist)
# DEFAULT_ADMIN_PASSWORD=yourpassword
```

### Frontend (`platform/frontend/.env`)

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

---

## Deployment

### Prerequisites

- Node.js 18+ on the server
- A hosting platform (Render, Railway, Heroku, VPS, etc.)
- Your songs repository URL

### Environment Variables for Production

Set these in your hosting platform's environment/secrets configuration:

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (usually set by platform) |
| `HOST` | No | Defaults to `0.0.0.0` |
| `COOKIE_SECRET` | **Yes** | Random string for signing cookies. **App will not start without this!** |
| `SONGS_JSON_URL` | **Yes** | URL to your songs.json file |
| `ADMIN_USERS` | **Yes** | Admin credentials, format: `user1:pass1,user2:pass2` |
| `DATABASE_PATH` | No | SQLite path (defaults to `./database/singalong.db`) |

> ⚠️ **Important**: The app will fail to start if `COOKIE_SECRET` is not set. There is no default fallback for security reasons.

### Deployment Steps

#### 1. Generate a Secure Cookie Secret

```bash
openssl rand -hex 32
```

#### 2. Set Environment Variables

In your hosting platform (e.g., Render dashboard), add:

```
COOKIE_SECRET=<your-generated-secret>
SONGS_JSON_URL=https://raw.githubusercontent.com/YourOrg/songs/master/songs.json
ADMIN_USERS=admin:SecurePass123,moti:AnotherSecurePass
```

#### 3. Build Commands

**Backend:**
```bash
cd platform/backend && npm install && npm run build
```

**Frontend:**
```bash
cd platform/frontend && npm install && npm run build
```

#### 4. Start Commands

**Backend:**
```bash
cd platform/backend && npm start
```

**Frontend:** Serve the `platform/frontend/dist/` folder with your static file server or CDN.

### Adding Admin Users

Admin users are automatically created on server startup from the `ADMIN_USERS` environment variable.

**To add a new admin:**
1. Update the `ADMIN_USERS` env var to include the new user
2. Restart the server

**Format:** `user1:password1,user2:password2,user3:password3`

**Example:**
```
ADMIN_USERS=alon:MySecurePass,moti:AnotherPass,iris:ThirdPass
```

Users that already exist in the database are skipped (passwords are not updated).

### Manual Admin Management

If you need to add an admin directly on the server:

```bash
cd platform/backend
./scripts/add-admin.sh <username> <password>
```

Or via sqlite3:
```bash
# First, generate a bcrypt hash (requires Node.js)
HASH=$(node -e "require('bcrypt').hash('yourpassword', 10).then(h => console.log(h))")

# Then insert
sqlite3 database/singalong.db "INSERT INTO admins (username, password_hash) VALUES ('newuser', '$HASH');"
```

### Database Persistence

SQLite stores data in `database/singalong.db`. Ensure your hosting platform has persistent storage, or the database will reset on each deploy.

**Platforms with persistent storage:** Railway, Render (with disk), VPS
**Platforms requiring external DB:** Heroku (use PostgreSQL instead, requires code changes)

---

## Common Workflows

### Full Restart

```bash
# Kill everything
kill -9 $(lsof -t -i :3001) 2>/dev/null
kill -9 $(lsof -t -i :5173) 2>/dev/null

# Start fresh
cd platform/backend && npm run dev &
cd platform/frontend && npm run dev &
```

### Reset Database State

```bash
sqlite3 platform/backend/database/singalong.db << EOF
DELETE FROM queue;
DELETE FROM sessions;
UPDATE playing_state SET current_song_id = NULL, current_verse_index = 0;
EOF
```

### Watch Backend Logs

The backend uses Pino with pretty-printing enabled. Output includes:
- HTTP request logs
- Socket.io connection events
- Error traces

---

## Ports Summary

| Service  | Port | URL                     |
|----------|------|-------------------------|
| Backend  | 3001 | http://localhost:3001   |
| Frontend | 5173 | http://localhost:5173   |


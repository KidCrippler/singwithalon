# Usage Guide

This guide covers how to build, run, and manage the SingWithAlon platform.

---

## Table of Contents

- [Building](#building)
- [Running](#running)
- [Stopping Services](#stopping-services)
- [SQLite Database Queries](#sqlite-database-queries)
- [cURL API Examples](#curl-api-examples)

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
  -d '{"username": "admin", "password": "changeme"}' \
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

```env
PORT=3001
HOST=0.0.0.0
DATABASE_PATH=./database/singalong.db
COOKIE_SECRET=your-secret-here
SONGS_JSON_URL=https://raw.githubusercontent.com/...
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
```

### Frontend (`platform/frontend/.env`)

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

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


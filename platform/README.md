# SingWithAlon Platform

A real-time sing-along web application for managing live music events. Displays lyrics and chords with live synchronization across all viewers, and enables audience participation through a song request queue.

## Features

- 🎤 **Real-time lyrics display** with synchronized verse navigation
- 🎸 **Chord mode** for musicians with exact spacing preservation
- 📱 **Multi-device sync** via WebSocket
- 📋 **Queue system** for audience song requests
- 🔐 **Admin controls** for event management
- 🌐 **RTL support** for Hebrew songs
- 🎹 **Transposition** (planned for Phase 3)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Fastify + TypeScript |
| Frontend | React + Vite + TypeScript |
| Real-time | Socket.io |
| Database | SQLite |
| Styling | CSS with Hebrew RTL support |

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Clone and navigate
cd platform

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Configuration

1. **Backend**: Edit `backend/.env` with your settings:
   ```env
   PORT=3001
   SONGS_JSON_URL=<your-songs-json-url>
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<your-password>
   COOKIE_SECRET=<random-secret>
   ```

2. **Frontend**: The default `frontend/.env` works for local development.

### Running

**Development mode:**

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

The frontend runs at `http://localhost:5173` and the backend at `http://localhost:3001`.


## Project Structure

```
platform/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── config.ts         # Configuration
│   │   ├── routes/           # API routes
│   │   ├── socket/           # Socket.io handlers
│   │   ├── db/               # Database schema & queries
│   │   └── types/            # TypeScript types
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main component
│   │   ├── context/          # React contexts
│   │   ├── components/       # UI components
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API client
│   │   └── types/            # TypeScript types
│   └── package.json
│
├── SPEC.md                   # Full specification
└── README.md                 # This file
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/login` | — | Admin login |
| `POST` | `/api/auth/logout` | Admin | Admin logout |
| `GET` | `/api/auth/me` | — | Check auth status |
| `GET` | `/api/songs` | — | List all songs |
| `GET` | `/api/songs/:id` | — | Get song metadata |
| `GET` | `/api/songs/:id/lyrics` | — | Get parsed lyrics |
| `POST` | `/api/songs/reload` | Admin | Reload songs from source |
| `GET` | `/api/queue` | Admin | Get queue |
| `POST` | `/api/queue` | — | Add to queue |
| `DELETE` | `/api/queue/:id` | — | Remove from queue |
| `GET` | `/api/state` | — | Get playing state |

## Socket.io Events

### Server → Client
- `song:changed` - New song playing
- `song:cleared` - No song playing
- `verse:changed` - Verse navigation
- `key:changed` - Transposition change
- `mode:changed` - Display mode change
- `queue:updated` - Queue update

### Client → Server
- `ping` - Keep-alive heartbeat
- `song:set` - Admin changes song
- `verse:next/prev` - Admin verse navigation
- `queue:add/remove` - Queue management

## Keyboard Shortcuts (Admin)

| Key | Action |
|-----|--------|
| Arrow Down/Right | Next verse |
| Arrow Up/Left | Previous verse |

These shortcuts work globally across all tabs when logged in as admin.

## Development Phases

- [x] **Phase 1**: Project setup & infrastructure
- [ ] **Phase 2**: Song loading & display
- [ ] **Phase 3**: Transposition
- [ ] **Phase 4**: Playing Now (real-time)
- [ ] **Phase 5**: Verse system
- [ ] **Phase 6**: Projection mode
- [ ] **Phase 7**: Queue system
- [ ] **Phase 8**: Polish & edge cases

## License

Private project - All rights reserved.


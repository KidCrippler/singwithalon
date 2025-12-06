import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import { RoomProvider } from './context/RoomContext';
import { PlayingNowProvider } from './context/PlayingNowContext';
import { SearchProvider } from './context/SearchContext';
import { SongsProvider } from './context/SongsContext';
import { QueueProvider } from './context/QueueContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Header } from './components/layout/Header';
import { SearchView } from './components/views/SearchView';
import { SongView } from './components/views/SongView';
import { PlayingNowView } from './components/views/PlayingNowView';
import { QueueView } from './components/views/QueueView';
import { SandboxView } from './components/views/SandboxView';
import { preloadBackgrounds } from './utils/backgrounds';

import './App.css';

// Default room for redirects
const DEFAULT_ROOM = import.meta.env.VITE_DEFAULT_ROOM || 'alon';

// Preload backgrounds once on app start
preloadBackgrounds().catch(err => {
  console.warn('Some backgrounds failed to preload:', err);
});

// Inner layout component that uses hooks requiring room context
function RoomContent() {
  // Keyboard shortcuts for admin verse navigation (needs PlayingNowContext)
  useKeyboardShortcuts();

  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

// Layout for room-scoped routes - includes all room-specific providers
// This MUST be inside a Route with :username param for useParams to work
function RoomLayout() {
  return (
    <RoomProvider>
      <PlayingNowProvider>
        <SearchProvider>
          <QueueProvider>
            <RoomContent />
          </QueueProvider>
        </SearchProvider>
      </PlayingNowProvider>
    </RoomProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <AuthProvider>
          <SongsProvider>
            <Routes>
              {/* Tools - not room-scoped */}
              <Route path="/tools/sandbox" element={<SandboxView />} />
              
              {/* Redirect root paths to default room */}
              <Route path="/" element={<Navigate to={`/${DEFAULT_ROOM}`} replace />} />
              <Route path="/admin" element={<Navigate to={`/${DEFAULT_ROOM}/admin`} replace />} />
              <Route path="/login" element={<Navigate to={`/${DEFAULT_ROOM}/admin`} replace />} />
              
              {/* Legacy routes - redirect to default room */}
              <Route path="/song/:id" element={<Navigate to={`/${DEFAULT_ROOM}/song/:id`} replace />} />
              <Route path="/playing-now" element={<Navigate to={`/${DEFAULT_ROOM}/playing-now`} replace />} />
              <Route path="/queue" element={<Navigate to={`/${DEFAULT_ROOM}/queue`} replace />} />
              
              {/* Room-scoped routes - RoomLayout provides all room context + header */}
              <Route path="/:username" element={<RoomLayout />}>
                <Route index element={<SearchView />} />
                <Route path="admin" element={<SearchView />} />
                <Route path="song/:id" element={<SongView />} />
                <Route path="playing-now" element={<PlayingNowView />} />
                <Route path="queue" element={<QueueView />} />
              </Route>
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to={`/${DEFAULT_ROOM}`} replace />} />
            </Routes>
          </SongsProvider>
        </AuthProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;

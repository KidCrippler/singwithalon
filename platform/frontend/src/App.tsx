import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
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
import { LoginView } from './components/views/LoginView';
import { preloadBackgrounds } from './utils/backgrounds';

import './App.css';

function AppContent() {
  // Enable global keyboard shortcuts for admin
  useKeyboardShortcuts();

  // Preload all background images into browser cache on startup
  useEffect(() => {
    preloadBackgrounds().catch(err => {
      console.warn('Some backgrounds failed to preload:', err);
    });
  }, []);

  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Routes>
          {/* Shared routes - mode is determined by context, not route */}
          <Route path="/" element={<SearchView />} />
          <Route path="/song/:id" element={<SongView />} />
          <Route path="/playing-now" element={<PlayingNowView />} />
          
          {/* Admin entry points - these set admin mode */}
          <Route path="/admin" element={<SearchView />} />
          <Route path="/queue" element={<QueueView />} />
          <Route path="/login" element={<LoginView />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <AuthProvider>
          <SongsProvider>
            <PlayingNowProvider>
              <SearchProvider>
                <QueueProvider>
                  <AppContent />
                </QueueProvider>
              </SearchProvider>
            </PlayingNowProvider>
          </SongsProvider>
        </AuthProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;

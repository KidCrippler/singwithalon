import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import { PlayingNowProvider } from './context/PlayingNowContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Header } from './components/layout/Header';
import { SearchView } from './components/views/SearchView';
import { SongView } from './components/views/SongView';
import { PlayingNowView } from './components/views/PlayingNowView';
import { QueueView } from './components/views/QueueView';
import { LoginView } from './components/views/LoginView';

import './App.css';

function AppContent() {
  // Enable global keyboard shortcuts for admin
  useKeyboardShortcuts();

  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Routes>
          {/* Viewer routes */}
          <Route path="/" element={<SearchView />} />
          <Route path="/song/:id" element={<SongView />} />
          <Route path="/playing-now" element={<PlayingNowView />} />
          
          {/* Admin routes */}
          <Route path="/admin" element={<SearchView />} />
          <Route path="/admin/song/:id" element={<SongView />} />
          <Route path="/admin/playing-now" element={<PlayingNowView />} />
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
          <PlayingNowProvider>
            <AppContent />
          </PlayingNowProvider>
        </AuthProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;

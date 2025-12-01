import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { usePlayingNow } from '../../context/PlayingNowContext';

export function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { isConnected } = useSocket();
  const { clearSong, state } = usePlayingNow();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClearSong = () => {
    if (state.currentSongId) {
      clearSong();
    }
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  const isAdminRoute = location.pathname.startsWith('/admin') || 
                       location.pathname === '/queue' ||
                       location.pathname === '/login';

  return (
    <header className="app-header">
      <div className="header-left">
        <Link to={isAdmin ? '/admin' : '/'} className="logo">
          🎤 שרים עם אלון
        </Link>
        
        <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '●' : '○'}
        </span>
      </div>

      <nav className="header-nav">
        {isAdmin ? (
          <>
            <Link 
              to="/admin" 
              className={location.pathname === '/admin' ? 'active' : ''}
            >
              חיפוש
            </Link>
            <Link 
              to="/playing-now"
              className={location.pathname === '/playing-now' ? 'active' : ''}
            >
              מתנגן עכשיו
            </Link>
            <Link 
              to="/queue"
              className={location.pathname === '/queue' ? 'active' : ''}
            >
              תור
            </Link>
          </>
        ) : (
          <>
            <Link 
              to="/"
              className={location.pathname === '/' ? 'active' : ''}
            >
              חיפוש
            </Link>
            <Link 
              to="/playing-now"
              className={location.pathname === '/playing-now' ? 'active' : ''}
            >
              מתנגן עכשיו
            </Link>
          </>
        )}
      </nav>

      <div className="header-right">
        {isAdmin ? (
          <div className="admin-info" ref={menuRef}>
            <span>👤 {user?.username}</span>
            <button 
              onClick={() => setMenuOpen(!menuOpen)} 
              className="admin-menu-btn"
              title="תפריט"
            >
              ☰
            </button>
            {menuOpen && (
              <div className="admin-menu-dropdown">
                <button 
                  onClick={handleClearSong}
                  disabled={!state.currentSongId}
                  className="menu-item"
                >
                  🏠 נקה שיר
                </button>
                <button onClick={handleLogout} className="menu-item">
                  🚪 התנתק
                </button>
              </div>
            )}
          </div>
        ) : isAdminRoute ? (
          <Link to="/login" className="login-link">התחבר</Link>
        ) : null}
      </div>
    </header>
  );
}


import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useSearch } from '../../context/SearchContext';
import { useQueue } from '../../context/QueueContext';
import { useRoom } from '../../context/RoomContext';
import { useSongs } from '../../context/SongsContext';
import { ToastContainer, useToast } from '../common/Toast';

export function Header() {
  const { user, isRoomOwner, logout } = useAuth();
  const { isConnected } = useSocket();
  const { clearSong, state } = usePlayingNow();
  const { filteredCount } = useSearch();
  const { queueCount } = useQueue();
  const { room } = useRoom();
  const { reloadSongs } = useSongs();
  const location = useLocation();
  const { username } = useParams<{ username: string }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { toasts, showToast, dismissToast } = useToast();

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

  const handleReloadSongs = async () => {
    setIsReloading(true);
    try {
      await reloadSongs();
      showToast('רשימת השירים עודכנה בהצלחה', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'שגיאה בטעינת שירים', 'error');
    } finally {
      setIsReloading(false);
      setMenuOpen(false);
    }
  };

  // Build room-scoped URLs
  const roomBase = username ? `/${username}` : '';
  const isAdminRoute = location.pathname.endsWith('/admin') || 
                       location.pathname.endsWith('/queue');

  // Display name from room context or fallback
  const displayName = room?.displayName || 'שרים עם אלון';

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <header className="app-header">
        <div className="header-left">
        <Link to={isRoomOwner ? `${roomBase}/admin` : roomBase || '/'} className="logo">
          🎤 {displayName}
        </Link>
        
        <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '●' : '○'}
        </span>
      </div>

      <nav className="header-nav">
        {isRoomOwner ? (
          <>
            <Link 
              to={`${roomBase}/admin`}
              className={location.pathname === `${roomBase}/admin` ? 'active' : ''}
            >
              חיפוש {filteredCount > 0 && `(${filteredCount})`}
            </Link>
            <Link 
              to={`${roomBase}/playing-now`}
              className={location.pathname === `${roomBase}/playing-now` ? 'active' : ''}
            >
              מתנגן עכשיו
            </Link>
            <Link 
              to={`${roomBase}/queue`}
              className={location.pathname === `${roomBase}/queue` ? 'active' : ''}
            >
              תור {queueCount > 0 && `(${queueCount})`}
            </Link>
          </>
        ) : (
          <>
            <Link 
              to={roomBase || '/'}
              className={location.pathname === roomBase || location.pathname === '/' ? 'active' : ''}
            >
              חיפוש {filteredCount > 0 && `(${filteredCount})`}
            </Link>
            <Link 
              to={`${roomBase}/playing-now`}
              className={location.pathname === `${roomBase}/playing-now` ? 'active' : ''}
            >
              מתנגן עכשיו
            </Link>
          </>
        )}
      </nav>

      <div className="header-right">
        {isRoomOwner ? (
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
                  onClick={handleReloadSongs}
                  disabled={isReloading}
                  className="menu-item"
                >
                  {isReloading ? '...' : '🔄'} רענן רשימת שירים
                </button>
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
          <Link to={`${roomBase}/admin`} className="login-link">התחבר</Link>
        ) : null}
      </div>
    </header>
    </>
  );
}

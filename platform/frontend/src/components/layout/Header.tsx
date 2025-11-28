import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { isConnected } = useSocket();
  const location = useLocation();

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
              to="/admin/playing-now"
              className={location.pathname === '/admin/playing-now' ? 'active' : ''}
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
          <div className="admin-info">
            <span>👤 {user?.username}</span>
            <button onClick={logout} className="logout-btn">התנתק</button>
          </div>
        ) : isAdminRoute ? (
          <Link to="/login" className="login-link">התחבר</Link>
        ) : null}
      </div>
    </header>
  );
}


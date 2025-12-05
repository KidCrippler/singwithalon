import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRoom } from '../../context/RoomContext';

export function LoginView() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isRoomOwner } = useAuth();
  const { room, roomError, isRoomLoading } = useRoom();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  // Redirect if already logged in as room owner
  React.useEffect(() => {
    if (isRoomOwner && username) {
      navigate(`/${username}/admin`);
    }
  }, [isRoomOwner, username, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    
    setError(null);
    setIsLoading(true);

    try {
      await login(username, password);
      navigate(`/${username}/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isRoomLoading) {
    return (
      <div className="login-view">
        <div className="login-card">
          <p>טוען...</p>
        </div>
      </div>
    );
  }

  if (roomError) {
    return (
      <div className="login-view">
        <div className="login-card">
          <h1>🚫 חדר לא נמצא</h1>
          <p>{roomError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-view">
      <div className="login-card">
        <h1>🔐 התחברות מנהל</h1>
        
        {/* Show which room we're logging into */}
        <p className="login-room-info">
          כניסה לחדר: <strong>{room?.displayName || username}</strong>
        </p>
        
        <form onSubmit={handleSubmit}>
          {/* Username is determined by URL, shown but not editable */}
          <div className="form-group">
            <label>שם משתמש</label>
            <input
              type="text"
              value={username || ''}
              disabled
              className="disabled-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">סיסמה</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              autoFocus
            />
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'מתחבר...' : 'התחבר'}
          </button>
        </form>
      </div>
    </div>
  );
}

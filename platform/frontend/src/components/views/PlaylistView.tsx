import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useRoom } from '../../context/RoomContext';
import { playlistApi } from '../../services/api';
import type { Playlist } from '../../types';

export function PlaylistView() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isRoomOwner } = useAuth();
  const { state, activePlaylist, jumpToPlaylistSong, refreshPlaylist } = usePlayingNow();
  const { roomUsername, isRoomLoading } = useRoom();
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  // Redirect non-owners
  useEffect(() => {
    if (!isRoomLoading && !isRoomOwner && username) {
      navigate(`/${username}/admin`);
    }
  }, [isRoomOwner, isRoomLoading, username, navigate]);

  // Fetch playlists list
  useEffect(() => {
    if (!isRoomOwner || !roomUsername) return;

    playlistApi.list(roomUsername)
      .then(setPlaylists)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [isRoomOwner, roomUsername]);

  const handleActivate = async (playlistId: number) => {
    if (!roomUsername) return;
    await playlistApi.activate(roomUsername, playlistId);
    playlistApi.list(roomUsername).then(setPlaylists).catch(console.error);
    refreshPlaylist();
  };

  const handleDeactivate = async () => {
    if (!roomUsername) return;
    await playlistApi.deactivate(roomUsername);
    playlistApi.list(roomUsername).then(setPlaylists).catch(console.error);
    refreshPlaylist();
  };

  const handleJump = (position: number) => {
    jumpToPlaylistSong(position);
    navigate(`/${username}/playing-now`);
  };

  if (isLoading) {
    return <div className="view-loading">טוען...</div>;
  }

  if (playlists.length === 0) {
    return (
      <div className="playlist-view">
        <div className="empty-state">
          <p>אין פלייליסטים מוגדרים</p>
          <p className="empty-hint">הגדר פלייליסטים במשתנה הסביבה PLAYLISTS</p>
        </div>
      </div>
    );
  }

  const noneActive = playlists.every(p => !p.isActive);

  return (
    <div className="playlist-view">
      {/* Playlist selector */}
      <div className="playlist-selector">
        <button
          className={`playlist-tab ${noneActive ? 'active' : ''}`}
          onClick={() => !noneActive && handleDeactivate()}
        >
          ללא
        </button>
        {playlists.map(p => (
          <button
            key={p.id}
            className={`playlist-tab ${p.isActive ? 'active' : ''}`}
            onClick={() => !p.isActive && handleActivate(p.id)}
          >
            {p.name} ({p.songCount})
          </button>
        ))}
      </div>

      {/* Active playlist songs */}
      {activePlaylist ? (
        <div className="playlist-songs">
          <h2 className="playlist-title">{activePlaylist.name}</h2>
          <div className="playlist-song-list">
            {activePlaylist.songs.map((song) => {
              const isCurrent = song.position === state.playlistPosition;
              const isPlayed = song.position < state.playlistPosition;
              return (
                <div
                  key={song.position}
                  className={`playlist-song-item ${isCurrent ? 'current' : ''} ${isPlayed ? 'played' : ''}`}
                  onClick={() => handleJump(song.position)}
                >
                  <span className="song-position">{song.position + 1}</span>
                  <div className="song-info">
                    <span className="song-name">{song.songName}</span>
                    <span className="song-artist">{song.songArtist}</span>
                  </div>
                  {isCurrent && <span className="current-indicator">▶</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>בחר פלייליסט</p>
        </div>
      )}
    </div>
  );
}

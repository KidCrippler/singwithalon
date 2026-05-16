import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePlayingNow } from '../../context/PlayingNowContext';
import { useRoom } from '../../context/RoomContext';
import { useSongs } from '../../context/SongsContext';
import { playlistApi } from '../../services/api';
import type { Playlist, PlaylistSong } from '../../types';

const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export function PlaylistView() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [drag, setDrag] = useState<{ srcIdx: number | null; overIdx: number | null; overHalf: 'top' | 'bottom' | null }>({
    srcIdx: null, overIdx: null, overHalf: null,
  });
  const [selectedForMove, setSelectedForMove] = useState<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const { isRoomOwner } = useAuth();
  const { state, activePlaylist, jumpToPlaylistSong, refreshPlaylist } = usePlayingNow();
  const { roomUsername, isRoomLoading } = useRoom();
  const { username } = useParams<{ username: string }>();
  const { songs } = useSongs();
  const navigate = useNavigate();

  // Redirect non-owners
  useEffect(() => {
    if (!isRoomLoading && !isRoomOwner && username) {
      navigate(`/${username}/admin`);
    }
  }, [isRoomOwner, isRoomLoading, username, navigate]);

  // Fetch playlists list
  const reloadPlaylists = useCallback(() => {
    if (!roomUsername) return;
    playlistApi.list(roomUsername).then(setPlaylists).catch(console.error);
  }, [roomUsername]);

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
    // reloadPlaylists updates isActive flags; refreshPlaylist fetches the new active song list
    reloadPlaylists();
    refreshPlaylist();
  };

  const handleDeactivate = async () => {
    if (!roomUsername) return;
    await playlistApi.deactivate(roomUsername);
    reloadPlaylists(); // updates isActive flags; context clears activePlaylist via activePlaylistId→null
  };

  const handleCreate = async () => {
    if (!roomUsername) return;
    const name = prompt('שם הפלייליסט:');
    if (!name?.trim()) return;
    const created = await playlistApi.create(roomUsername, name.trim());
    reloadPlaylists();
    await handleActivate(created.id);
  };

  const handleDelete = async () => {
    if (!roomUsername || !activePlaylist) return;
    if (!confirm(`למחוק את "${activePlaylist.name}"?`)) return;
    await playlistApi.remove(roomUsername, activePlaylist.id);
    reloadPlaylists(); // context clears activePlaylist via socket broadcast
  };

  const handleRename = async () => {
    if (!roomUsername || !activePlaylist || !nameValue.trim()) return;
    if (nameValue.trim() === activePlaylist.name) {
      setEditingName(false);
      return;
    }
    await playlistApi.update(roomUsername, activePlaylist.id, { name: nameValue.trim() });
    reloadPlaylists(); // updates tab label; refreshPlaylist not needed (name change only)
    refreshPlaylist();
    setEditingName(false);
  };

  const startEditing = () => {
    if (!activePlaylist) return;
    setNameValue(activePlaylist.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const handleJump = (position: number) => {
    jumpToPlaylistSong(position);
    navigate(`/${username}/playing-now`);
  };

  // Song list mutations
  const updateSongList = async (newSongIds: number[]) => {
    if (!roomUsername || !activePlaylist) return;
    await playlistApi.update(roomUsername, activePlaylist.id, { songIds: newSongIds });
    reloadPlaylists();
    refreshPlaylist();
  };

  const handleRemoveSong = (position: number) => {
    if (!activePlaylist) return;
    const newIds = activePlaylist.songs.map(s => s.songId).filter((_, i) => i !== position);
    updateSongList(newIds);
  };

  const handleAddSong = (songId: number) => {
    if (!activePlaylist) return;
    const currentIds = activePlaylist.songs.map(s => s.songId);
    if (currentIds.includes(songId)) return;
    updateSongList([...currentIds, songId]);
    setSearchQuery('');
  };

  const clearDrag = useCallback(() => setDrag({ srcIdx: null, overIdx: null, overHalf: null }), []);

  // Drag and drop
  const onDragStart = useCallback((idx: number) => {
    setDrag(prev => ({ ...prev, srcIdx: idx }));
  }, []);

  const onDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const overHalf = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
    setDrag(prev => {
      if (idx === prev.srcIdx) return prev;
      if (prev.overIdx === idx && prev.overHalf === overHalf) return prev;
      return { ...prev, overIdx: idx, overHalf };
    });
  }, []);

  const onDragLeave = useCallback(() => {
    setDrag(prev => ({ ...prev, overIdx: null, overHalf: null }));
  }, []);

  const onDrop = useCallback((e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const half = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
    setDrag(prev => {
      if (prev.srcIdx === null || prev.srcIdx === targetIdx || !activePlaylist) return { srcIdx: null, overIdx: null, overHalf: null };

      const arr = activePlaylist.songs.map(s => s.songId);
      let insertIdx = half === 'top' ? targetIdx : targetIdx + 1;

      const [item] = arr.splice(prev.srcIdx, 1);
      if (prev.srcIdx < insertIdx) insertIdx--;
      arr.splice(insertIdx, 0, item);

      updateSongList(arr);
      return { srcIdx: null, overIdx: null, overHalf: null };
    });
  }, [activePlaylist, updateSongList]);

  const onDragEnd = useCallback(() => clearDrag(), [clearDrag]);

  // Touch: tap-to-select, tap-to-place
  const handleTapToMove = useCallback((position: number) => {
    if (!activePlaylist) return;
    if (selectedForMove === null) {
      setSelectedForMove(position);
    } else {
      if (selectedForMove === position) {
        setSelectedForMove(null);
        return;
      }
      const arr = activePlaylist.songs.map(s => s.songId);
      const [item] = arr.splice(selectedForMove, 1);
      const insertIdx = selectedForMove < position ? position - 1 : position;
      arr.splice(insertIdx, 0, item);
      setSelectedForMove(null);
      updateSongList(arr);
    }
  }, [activePlaylist, selectedForMove, updateSongList]);

  // Memoized search results — only recomputes when query or songs change
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return songs.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.singer.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery, songs]);

  if (isRoomLoading || isLoading) {
    return <div className="view-loading">טוען...</div>;
  }

  if (!isRoomOwner) return null;

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
        <button className="playlist-tab create-btn" onClick={handleCreate}>
          + חדש
        </button>
      </div>

      {/* Active playlist content */}
      {activePlaylist ? (
        <div className="playlist-songs">
          {/* Editable header */}
          <div className="playlist-header-row">
            {editingName ? (
              <input
                ref={nameInputRef}
                className="playlist-edit-name"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={handleRename}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
              />
            ) : (
              <h2 className="playlist-title" onClick={startEditing} title="לחץ לעריכת שם">
                {activePlaylist.name}
              </h2>
            )}
            <button className="playlist-delete-btn" onClick={handleDelete} title="מחק פלייליסט">
              🗑️
            </button>
          </div>

          {/* Song list — drag on desktop, tap-to-move on touch */}
          <div className="playlist-song-list">
            {selectedForMove !== null && (
              <div className="move-hint">הקש על המיקום החדש</div>
            )}
            {activePlaylist.songs.map((song: PlaylistSong) => {
              const isCurrent = song.position === state.playlistPosition;
              const isDragging = song.position === drag.srcIdx;
              const isOver = song.position === drag.overIdx;
              const isSelected = song.position === selectedForMove;
              const isDropTarget = selectedForMove !== null && song.position !== selectedForMove;
              return (
                <div
                  key={`${song.songId}-${song.position}`}
                  className={`playlist-song-item ${isCurrent ? 'current' : ''} ${isDragging ? 'dragging' : ''} ${isOver && drag.overHalf === 'top' ? 'drag-over-top' : ''} ${isOver && drag.overHalf === 'bottom' ? 'drag-over-bottom' : ''} ${isSelected ? 'selected-for-move' : ''} ${isDropTarget ? 'drop-target' : ''}`}
                  draggable={!isTouchDevice()}
                  onDragStart={() => onDragStart(song.position)}
                  onDragOver={e => onDragOver(e, song.position)}
                  onDragLeave={onDragLeave}
                  onDrop={e => onDrop(e, song.position)}
                  onDragEnd={onDragEnd}
                >
                  <span
                    className="drag-handle"
                    onClick={isTouchDevice() ? () => handleTapToMove(song.position) : undefined}
                  >
                    {isSelected ? '✓' : '⠿'}
                  </span>
                  <span className="song-position">{song.position + 1}</span>
                  <div
                    className="song-info"
                    onClick={isDropTarget ? () => handleTapToMove(song.position) : () => handleJump(song.position)}
                  >
                    <span className="song-name">{song.songName}</span>
                    <span className="song-artist">{song.songArtist}</span>
                  </div>
                  {isCurrent && <span className="current-indicator">▶</span>}
                  <button
                    className="song-remove-btn"
                    onClick={e => { e.stopPropagation(); handleRemoveSong(song.position); }}
                    title="הסר מהפלייליסט"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Inline search to add songs */}
          <div className="playlist-add-section">
            <input
              className="playlist-add-search"
              placeholder="הוסף שיר..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="playlist-search-results">
                {searchResults.map(s => (
                  <div
                    key={s.id}
                    className="search-result-item"
                    onClick={() => handleAddSong(s.id)}
                  >
                    <span className="result-name">{s.name}</span>
                    <span className="result-artist">{s.singer}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>{playlists.length === 0 ? 'צור פלייליסט חדש' : 'בחר פלייליסט'}</p>
        </div>
      )}
    </div>
  );
}

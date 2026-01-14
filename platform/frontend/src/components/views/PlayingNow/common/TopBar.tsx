import { useAuth } from '../../../../context/AuthContext';
import { formatCredits } from '../../../../utils/formatCredits';
import { AdminControls } from '../admin/AdminControls';
import { ViewerControls } from '../viewers/ViewerControls';
import type { ParsedSong, Song } from '../../../../types';

interface TopBarProps {
  lyrics: ParsedSong;
  song: Song | null;
  isRtl: boolean;
  versesCount: number;
  isAtFirstVerse: boolean;
  isAtLastVerse: boolean;
  currentVerseIndex: number;
  onEnterFullscreen: () => void;
}

export function TopBar({
  lyrics,
  song,
  isRtl,
  versesCount,
  isAtFirstVerse,
  isAtLastVerse,
  currentVerseIndex,
  onEnterFullscreen,
}: TopBarProps) {
  const { isRoomOwner } = useAuth();

  return (
    <div className="song-top-bar">
      {/* Admin controls inline */}
      {isRoomOwner && (
        <AdminControls
          versesCount={versesCount}
          isAtFirstVerse={isAtFirstVerse}
          isAtLastVerse={isAtLastVerse}
          currentVerseIndex={currentVerseIndex}
          onEnterFullscreen={onEnterFullscreen}
        />
      )}

      {/* Viewer controls */}
      {!isRoomOwner && <ViewerControls onEnterFullscreen={onEnterFullscreen} />}

      {/* Song title inline */}
      <div className="song-title-compact">
        {lyrics.metadata.title}
        <span className="artist"> - {lyrics.metadata.artist}</span>
        {song && (song.composers?.length || song.lyricists?.length || song.translators?.length) && (
          <span className="credits-compact">
            {' | '}
            {formatCredits(song, isRtl)}
          </span>
        )}
      </div>
    </div>
  );
}

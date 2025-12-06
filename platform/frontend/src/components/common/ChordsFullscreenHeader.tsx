import { formatCredits } from '../../utils/formatCredits';
import type { Song } from '../../types';
import './ChordsFullscreenHeader.css';

interface ChordsFullscreenHeaderProps {
  title: string;
  artist: string;
  song?: Song | null;
  isRtl: boolean;
}

export function ChordsFullscreenHeader({ title, artist, song, isRtl }: ChordsFullscreenHeaderProps) {
  const hasCredits = song && (song.composers?.length || song.lyricists?.length || song.translators?.length);
  
  return (
    <div className={`chords-fullscreen-header ${isRtl ? 'rtl' : 'ltr'}`}>
      <span className="chords-fs-title">{title}</span>
      <span className="chords-fs-separator"> — </span>
      <span className="chords-fs-artist">{artist}</span>
      {hasCredits && (
        <>
          <span className="chords-fs-separator"> | </span>
          <span className="chords-fs-credits">{formatCredits(song, isRtl)}</span>
        </>
      )}
    </div>
  );
}


import type { Song } from '../types';

// Helper to check if two string arrays are equal
function arraysEqual(a?: string[], b?: string[]): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}

// Format credits based on language (RTL = Hebrew, LTR = English)
export function formatCredits(song: Song, isRtl: boolean): string {
  const parts: string[] = [];
  const composers = song.composers;
  const lyricists = song.lyricists;
  const translators = song.translators;

  // Check if composers and lyricists are the same
  const sameComposerLyricist = arraysEqual(composers, lyricists) && composers?.length;

  if (sameComposerLyricist) {
    // Combined credit
    const label = isRtl ? 'מילים ולחן' : 'Lyrics and Music';
    parts.push(`${label}: ${composers!.join(', ')}`);
  } else {
    // Separate credits
    if (composers?.length) {
      const label = isRtl ? 'לחן' : 'Music';
      parts.push(`${label}: ${composers.join(', ')}`);
    }
    if (lyricists?.length) {
      const label = isRtl ? 'מילים' : 'Lyrics';
      parts.push(`${label}: ${lyricists.join(', ')}`);
    }
  }

  if (translators?.length) {
    const label = isRtl ? 'תרגום' : 'Translation';
    parts.push(`${label}: ${translators.join(', ')}`);
  }

  return parts.join(' | ');
}


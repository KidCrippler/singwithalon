import { FastifyInstance } from 'fastify';
import { playingStateQueries } from '../db/index.js';
import { getSongsIndex } from './songs.js';

export async function stateRoutes(fastify: FastifyInstance) {
  // Get current playing state
  fastify.get('/api/state', async (request, reply) => {
    const state = playingStateQueries.get();
    
    // Enrich with song info if a song is playing
    let song = null;
    if (state.current_song_id) {
      const songsIndex = getSongsIndex();
      const foundSong = songsIndex.find(s => s.id === state.current_song_id);
      if (foundSong) {
        song = {
          id: foundSong.id,
          name: foundSong.name,
          singer: foundSong.singer,
          composers: foundSong.composers,
          lyricists: foundSong.lyricists,
          translators: foundSong.translators,
          direction: foundSong.direction,
        };
      }
    }

    return {
      currentSongId: state.current_song_id,
      currentVerseIndex: state.current_verse_index,
      currentKeyOffset: state.current_key_offset,
      displayMode: state.display_mode,
      versesEnabled: state.verses_enabled === 1,
      projectorWidth: state.projector_width,
      projectorHeight: state.projector_height,
      projectorLinesPerVerse: state.projector_lines_per_verse,
      song,
    };
  });
}


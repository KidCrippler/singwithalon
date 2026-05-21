import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ParsedSong } from '../types/index.js';
import { stripDirectionalChars, detectDirection, parseLine } from '../services/songParser.js';

/**
 * Tools routes - utility endpoints for development/admin tools
 * These endpoints are not room-scoped and require no authentication
 */
export async function toolsRoutes(fastify: FastifyInstance) {

  /**
   * Parse chord sheet markup text into structured format
   * Used by the sandbox tool for real-time preview
   *
   * POST /api/tools/parse-markup
   * Body: Raw text content (Content-Type: text/plain)
   * Returns: ParsedSong JSON
   */
  fastify.post('/api/tools/parse-markup', {
    config: {
      rawBody: true,
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const text = request.body as string;

    if (!text || typeof text !== 'string') {
      return reply.status(400).send({ error: 'Request body must be text' });
    }

    try {
      const parsed = parseSongMarkup(text);
      return parsed;
    } catch (error) {
      console.error('Failed to parse markup:', error);
      return reply.status(500).send({ error: 'Failed to parse markup' });
    }
  });
}

/**
 * Parse song markup text into structured format.
 * Standalone version for the sandbox - extracts all metadata from the text itself.
 */
function parseSongMarkup(text: string): ParsedSong {
  const lines = text.split('\n');
  const parsedLines: ParsedSong['lines'] = [];

  let title = '';
  let artist = '';
  let credits = '';
  let metadataEnded = false;
  let lineIndex = 0;

  for (let i = 0; i < lines.length && !metadataEnded; i++) {
    const line = stripDirectionalChars(lines[i]).trim();

    if (line === '') {
      metadataEnded = true;
      lineIndex = i + 1;
      continue;
    }

    if (i === 0 && (line.includes(' - ') || line.includes(' – '))) {
      const separator = line.includes(' - ') ? ' - ' : ' – ';
      const [t, a] = line.split(separator);
      if (t) title = stripDirectionalChars(t).trim();
      if (a) artist = stripDirectionalChars(a).trim();
      lineIndex = i + 1;
    } else if (line.match(/^(מילים|לחן|תרגום|Lyrics|Music|Translation|מילים ולחן|Lyrics and Music)/i)) {
      credits = credits ? credits + '   ' + line : line;
      lineIndex = i + 1;
    }
  }

  const direction = detectDirection(text);
  const isRtl = direction === 'rtl';

  for (let i = lineIndex; i < lines.length; i++) {
    parsedLines.push(parseLine(lines[i], isRtl));
  }

  return {
    metadata: {
      title: title || 'ללא כותרת',
      artist: artist || '',
      credits,
      direction,
    },
    lines: parsedLines,
  };
}

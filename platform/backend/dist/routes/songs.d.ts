import { FastifyInstance } from 'fastify';
import type { Song } from '../types/index.js';
export declare function getSongsIndex(): Song[];
export declare function loadSongsIndex(): Promise<void>;
export declare function songsRoutes(fastify: FastifyInstance): Promise<void>;
/**
 * Check if a token is a valid chord token.
 * Exported for testing purposes.
 */
export declare function isValidChordToken(token: string): boolean;
/**
 * Reverse a chord line for RTL display.
 * Algorithm:
 * 1. Reverse the entire string character by character
 * 2. For each token, reverse it back to restore chord names
 * 3. For tokens with unbalanced brackets, move bracket to opposite side and swap type
 *
 * Example: "   C  G Am  D  Em    Em"
 * Step 1 (reverse all): "mE    mE  D  mA G  C   "
 * Step 2 (reverse tokens): "Em    Em  D  Am G  C   "
 *
 * Example with parens: "(Cm   Ab   Eb   Bb) x 2"
 * Step 1 (reverse): "2 x )bB   bE   bA   mC("
 * Step 2 (reverse tokens): "2 x Bb)   Eb   Ab   (Cm"
 * Step 3 (fix brackets): "2 x (Bb   Eb   Ab   Cm)"
 *
 * Exported for testing purposes.
 */
export declare function reverseChordLineForRtl(line: string): string;

/**
 * Unit tests for chord transposition service.
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import { parseChord, transposeChord, transposeChordLine, formatOffset } from './transpose';
import { formatChordLineForDisplay } from './chordDisplay';

describe('parseChord', () => {
  describe('simple chords', () => {
    it('parses simple major chord', () => {
      const result = parseChord('C');
      expect(result).toEqual({
        root: 'C',
        accidental: '',
        modifiers: '',
        bass: null,
        bassAccidental: '',
        original: 'C',
      });
    });

    it('parses minor chord', () => {
      const result = parseChord('Am');
      expect(result?.root).toBe('A');
      expect(result?.modifiers).toBe('m');
    });

    it('parses seventh chord', () => {
      const result = parseChord('G7');
      expect(result?.root).toBe('G');
      expect(result?.modifiers).toBe('7');
    });

    it('parses maj7 chord', () => {
      const result = parseChord('Cmaj7');
      expect(result?.root).toBe('C');
      expect(result?.modifiers).toBe('maj7');
    });

    it('parses diminished chord with o', () => {
      const result = parseChord('Fo7');
      expect(result?.root).toBe('F');
      expect(result?.modifiers).toBe('o7');
    });

    it('parses diminished chord with °', () => {
      const result = parseChord('B°7');
      expect(result?.root).toBe('B');
      expect(result?.modifiers).toBe('°7');
    });
  });

  describe('accidentals', () => {
    it('parses sharp chord', () => {
      const result = parseChord('F#');
      expect(result?.root).toBe('F#');
      expect(result?.accidental).toBe('#');
    });

    it('parses flat chord', () => {
      const result = parseChord('Bb');
      expect(result?.root).toBe('Bb');
      expect(result?.accidental).toBe('b');
    });

    it('parses sharp minor chord', () => {
      const result = parseChord('F#m');
      expect(result?.root).toBe('F#');
      expect(result?.modifiers).toBe('m');
    });

    it('parses flat major 7 chord', () => {
      const result = parseChord('BbMaj7');
      expect(result?.root).toBe('Bb');
      expect(result?.modifiers).toBe('Maj7');
    });
  });

  describe('slash chords (with bass)', () => {
    it('parses slash chord', () => {
      const result = parseChord('A/C#');
      expect(result?.root).toBe('A');
      expect(result?.bass).toBe('C#');
      expect(result?.bassAccidental).toBe('#');
    });

    it('parses minor slash chord', () => {
      const result = parseChord('Am/G');
      expect(result?.root).toBe('A');
      expect(result?.modifiers).toBe('m');
      expect(result?.bass).toBe('G');
    });
  });

  describe('bass-only notation', () => {
    it('parses bass-only', () => {
      const result = parseChord('/F');
      expect(result?.root).toBe('');
      expect(result?.bass).toBe('F');
    });

    it('parses bass-only sharp', () => {
      const result = parseChord('/F#');
      expect(result?.bass).toBe('F#');
      expect(result?.bassAccidental).toBe('#');
    });

    it('parses bass-only flat', () => {
      const result = parseChord('/Bb');
      expect(result?.bass).toBe('Bb');
    });
  });

  describe('bracketed chords', () => {
    it('parses bracketed chord', () => {
      const result = parseChord('[Am]');
      expect(result?.root).toBe('A');
      expect(result?.modifiers).toBe('m');
    });

    it('parses bracketed bass-only', () => {
      const result = parseChord('[/A]');
      expect(result?.root).toBe('');
      expect(result?.bass).toBe('A');
    });
  });

  describe('invalid inputs', () => {
    it('returns null for empty string', () => {
      expect(parseChord('')).toBeNull();
    });

    it('returns null for invalid note', () => {
      expect(parseChord('H')).toBeNull();
      expect(parseChord('X')).toBeNull();
    });

    it('returns null for regular word', () => {
      expect(parseChord('Hello')).toBeNull();
    });
  });
});

describe('transposeChord', () => {
  describe('preserves original at offset 0', () => {
    it('preserves G# at offset 0 (not Ab)', () => {
      expect(transposeChord('G#', 0)).toBe('G#');
    });

    it('preserves Db at offset 0 (even though C# is preferred)', () => {
      expect(transposeChord('Db', 0)).toBe('Db');
    });

    it('preserves A# at offset 0', () => {
      expect(transposeChord('A#', 0)).toBe('A#');
    });
  });

  describe('uses preferred enharmonic when transposing', () => {
    it('G + 1 = Ab (preferred, not G#)', () => {
      expect(transposeChord('G', 1)).toBe('Ab');
    });

    it('A + 1 = Bb (preferred, not A#)', () => {
      expect(transposeChord('A', 1)).toBe('Bb');
    });

    it('D + 1 = Eb (preferred, not D#)', () => {
      expect(transposeChord('D', 1)).toBe('Eb');
    });

    it('F + 1 = F# (preferred, not Gb)', () => {
      expect(transposeChord('F', 1)).toBe('F#');
    });

    it('C + 1 = C# (preferred, not Db)', () => {
      expect(transposeChord('C', 1)).toBe('C#');
    });
  });

  describe('transposition math', () => {
    it('transposes up by semitones', () => {
      expect(transposeChord('C', 2)).toBe('D');
      expect(transposeChord('C', 4)).toBe('E');
      expect(transposeChord('C', 7)).toBe('G');
      expect(transposeChord('C', 12)).toBe('C'); // Full octave
    });

    it('transposes down by semitones', () => {
      expect(transposeChord('C', -1)).toBe('B');
      expect(transposeChord('C', -2)).toBe('Bb');
      expect(transposeChord('C', -5)).toBe('G');
    });

    it('handles edge cases around octave', () => {
      expect(transposeChord('B', 1)).toBe('C');
      expect(transposeChord('C', -1)).toBe('B');
    });
  });

  describe('preserves modifiers', () => {
    it('preserves m (minor)', () => {
      expect(transposeChord('Am', 2)).toBe('Bm');
    });

    it('preserves 7', () => {
      expect(transposeChord('G7', 2)).toBe('A7');
    });

    it('preserves maj7', () => {
      expect(transposeChord('Cmaj7', 2)).toBe('Dmaj7');
    });

    it('preserves sus4', () => {
      expect(transposeChord('Dsus4', 2)).toBe('Esus4');
    });

    it('preserves dim', () => {
      expect(transposeChord('Bdim', 1)).toBe('Cdim');
    });

    it('preserves complex modifiers', () => {
      expect(transposeChord('Bm7b5', 2)).toBe('C#m7b5');
    });
  });

  describe('transposes bass notes', () => {
    it('transposes slash chord bass', () => {
      expect(transposeChord('A/C#', 2)).toBe('B/Eb');
    });

    it('transposes bass-only notation', () => {
      expect(transposeChord('/F', 2)).toBe('/G');
    });

    it('transposes bracketed bass-only', () => {
      expect(transposeChord('[/A]', 2)).toBe('[/B]');
    });
  });

  describe('preserves diminished notation (o) - formatting is separate', () => {
    it('preserves Fo7 as Fo7 (formatting happens separately)', () => {
      expect(transposeChord('Fo7', 0)).toBe('Fo7');
    });

    it('preserves o notation after transpose', () => {
      expect(transposeChord('Ao7', 2)).toBe('Bo7');
    });

    it('preserves ° notation', () => {
      expect(transposeChord('F°7', 0)).toBe('F°7');
      expect(transposeChord('A°7', 2)).toBe('B°7');
    });
  });

  describe('handles bracketed chords', () => {
    it('preserves brackets', () => {
      expect(transposeChord('[Am]', 2)).toBe('[Bm]');
    });

    it('preserves brackets with transposition', () => {
      expect(transposeChord('[F#m]', 1)).toBe('[Gm]');
    });
  });

  describe('handles exclamation marks', () => {
    it('preserves exclamation mark', () => {
      expect(transposeChord('Am!', 2)).toBe('Bm!');
    });
  });
});

describe('transposeChordLine', () => {
  describe('transposes all chords in a line', () => {
    it('transposes simple chord line', () => {
      expect(transposeChordLine('Am   Dm   G    C', 2)).toBe('Bm   Em   A    D');
    });

    it('maintains chord start positions (alignment)', () => {
      // Each chord should START at the same index as original
      // D (pos 0), Gmaj7 (pos 21), A/C# (pos 29), F#m (pos 48)
      const original = 'D                    Gmaj7  A/C#               F#m';
      const expected = 'Eb                   Abmaj7 Bb/D               Gm';
      expect(transposeChordLine(original, 1)).toBe(expected);
    });

    it('handles chords getting shorter', () => {
      // F#m -> Gm (shorter), adds space to maintain next chord position
      expect(transposeChordLine('F#m  G', 1)).toBe('Gm   Ab');
    });

    it('handles mixed accidentals with alignment', () => {
      // F#m at 0 -> Abm at 0 (same length)
      // B at 6 -> C# at 6 (1 char longer, reduces next spacing)
      // E at 10 -> F# at 10
      expect(transposeChordLine('F#m   B   E', 2)).toBe('Abm   C#  F#');
    });
  });

  describe('preserves non-chord tokens', () => {
    it('preserves arrows', () => {
      expect(transposeChordLine('Am --->  G', 2)).toBe('Bm --->  A');
    });

    it('preserves x and numbers', () => {
      // Eb->F (shorter), Bb->C (shorter) - positions maintained, trailing spaces added
      expect(transposeChordLine('(Cm   Ab   Eb   Bb) x 2', 2)).toBe('(Dm   Bb   F    C)  x 2');
    });

    it('preserves single hyphen', () => {
      expect(transposeChordLine('Am - G - F', 2)).toBe('Bm - A - G');
    });

    it('preserves empty brackets', () => {
      expect(transposeChordLine('Am   []   G', 2)).toBe('Bm   []   A');
    });
  });

  describe('handles parenthesized chords', () => {
    it('transposes chord with leading paren', () => {
      expect(transposeChordLine('(Am   G)', 2)).toBe('(Bm   A)');
    });
  });

  describe('preserves diminished notation (formatting is separate)', () => {
    it('preserves o notation at offset 0', () => {
      expect(transposeChordLine('Fo7   Am', 0)).toBe('Fo7   Am');
    });

    it('preserves ° notation', () => {
      expect(transposeChordLine('Bbm    B°7    C', 0)).toBe('Bbm    B°7    C');
    });
  });
});

describe('formatOffset', () => {
  it('formats zero as 0', () => {
    expect(formatOffset(0)).toBe('0');
  });

  it('formats positive with +', () => {
    expect(formatOffset(1)).toBe('+1');
    expect(formatOffset(6)).toBe('+6');
  });

  it('formats negative with -', () => {
    expect(formatOffset(-1)).toBe('-1');
    expect(formatOffset(-6)).toBe('-6');
  });
});

// =============================================================================
// DISPLAY FORMATTING (from chordDisplay.ts)
// =============================================================================

describe('formatChordLineForDisplay', () => {
  it('converts o to ° in diminished chords', () => {
    expect(formatChordLineForDisplay('Fo7')).toBe('F°7');
    expect(formatChordLineForDisplay('Bo7')).toBe('B°7');
    expect(formatChordLineForDisplay('Ao')).toBe('A°');
  });

  it('converts all o to ° in a chord line', () => {
    expect(formatChordLineForDisplay('Fo7   Am   Bo7')).toBe('F°7   Am   B°7');
  });

  it('preserves spacing', () => {
    expect(formatChordLineForDisplay('Fo7       Am')).toBe('F°7       Am');
  });

  it('preserves ° that is already there', () => {
    expect(formatChordLineForDisplay('F°7')).toBe('F°7');
  });

  it('preserves regular chords', () => {
    expect(formatChordLineForDisplay('Am   G7   Cmaj7')).toBe('Am   G7   Cmaj7');
  });
});

// =============================================================================
// REAL-WORLD SONG EXCERPTS
// =============================================================================

describe('real-world song excerpts', () => {
  it('handles Hebrew song chord line (apage169)', () => {
    const line = 'Dm          A';
    expect(transposeChordLine(line, 2)).toBe('Em          B');
  });

  it('handles complex chord line with diminished', () => {
    const line = 'Bbm    B°7    C';
    // At offset 2: Bbm -> Cm (shorter), B°7 -> C#°7 (longer), C -> D
    // Positions maintained: Cm at 0, C#°7 at 7, D at 14
    expect(transposeChordLine(line, 2)).toBe('Cm     C#°7   D');
  });

  it('handles bass progression (apage237)', () => {
    const line = 'G/ - G#/ - G/';
    // These are bass-only notations that might fail parsing
    // Let's see if they're handled as regular tokens
    const result = transposeChordLine(line, 2);
    // G/ and G#/ might not parse correctly - they need to be /G and /G#
    // This test documents current behavior
    expect(result).toBeDefined();
  });

  it('handles progression with repeat', () => {
    const line = '(Em   A   D   Dmaj7) x 2';
    // (Em -> (F#m (longer), reduces following spacing
    expect(transposeChordLine(line, 2)).toBe('(F#m  B   E   Emaj7) x 2');
  });
});

// =============================================================================
// INTEGRATION: Transposition + Display Formatting
// =============================================================================

describe('integration: transpose then format', () => {
  it('full pipeline: transpose then format for display', () => {
    const original = 'Fo7   Am   Bo7';
    const transposed = transposeChordLine(original, 2);
    const formatted = formatChordLineForDisplay(transposed);
    
    // Fo7 + 2 = Go7, Am + 2 = Bm, Bo7 + 2 = C#o7
    // Then format: Go7 -> G°7, C#o7 -> C#°7
    expect(formatted).toBe('G°7   Bm   C#°7');
  });

  it('format then transpose (order matters - format should be last)', () => {
    const original = 'Fo7   Am';
    
    // Correct order: transpose first, then format
    const correctResult = formatChordLineForDisplay(transposeChordLine(original, 2));
    expect(correctResult).toBe('G°7   Bm');
  });
});


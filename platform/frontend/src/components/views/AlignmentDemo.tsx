import { useState, useMemo, useRef, useLayoutEffect, useCallback } from 'react';
import { transposeChord, formatOffset } from '../../services/transpose';

// When You're Gone - Bryan Adams and Melanie C (LTR English)
const RAW_SONG = `When You're Gone - Bryan Adams and Melanie C
Lyrics and Music: Bryan Adams and Eliott Kennedy

Dm      F     C                     G
                  When you're gone!

            Dm                  G
I've been wandering around the house all night
C                             C4
Wond'ring what the hell to do
      C     Dm                      G                      C    C4 C
Yeah, I'm trying to concentrate but all I can think of is you
           Dm                         G
Well, the phone don't ring cause my friends ain't home
C                           C4  C
I'm tired of being all alone
         Dm               Bb              G
Got the TV on, cause the radio's playing songs that remind me of you

                 Dm   F
Baby when you're gone
                  C   G
I realize I'm in love
               Dm  F
Days go on and on
                          C  G
And the nights just seem so long
                            Dm   F
Even food don't taste that good
                            C    G
Drink ain't doing what it should
                     Dm   Bb
Things just feel so wrong
                   G
Baby, when you're gone

                  Dm            G
Yeah, I've been driving up and down these streets
C                             C4
Trying to find somewhere to go
           Dm                     G                          C    C4  C
Yeah, I'm lookin' for a familiar face but there's no one I know
    Dm                G                 C                   C4   C
Ah, this is torture, this is pain, it feels like I'm gonna go insane
   Dm                 Bb                     G
I hope you're coming back real soon cause I don't know what to do

                 Dm   F
Baby when you're gone (When you're gone)
                  C   G
I realize I'm in love
               Dm  F
Days go on and on (On and on)
                          C  G
And the nights just seem so long
                            Dm   F
Even food don't taste that good
                            C    G
Drink ain't doing what it should
                     Dm   Bb
Things just feel so wrong
                        G
Yeah, baby, when you're gone

{Guitar Solo}
Dm   G    C   C4   C
Dm   G    C   C4   C
Dm   G    C   C4   C
Dm   Bb   G   G

                 Dm   F
Baby when you're gone (When you're gone)
                  C   G
I realize I'm in love (I'm in love)
               Dm  F
Days go on and on
                          C  G
And the nights just seem so long
                            Dm   F
Even food don't taste that good
                            C    G
Drink ain't doing what it should
                     Dm   Bb
Things just feel so wrong (So wrong)
                   G
Baby, when you're gone (You're gone)

                   Dm  Bb
Baby, when you're gone
                   F
Baby, when you're gone`;

// Chord detection regex
const CHORD_REGEX = /^[A-G][#b]?(m|M|[Mm]aj|[Mm]in|dim|aug|sus[24]?|add|o|°|\+)?[0-9]*(b[0-9]+)?(\/[A-G][#b]?)?!?$/;

interface ChordToken {
  chord: string;
  position: number; // character position in original line
}

interface ParsedPair {
  chordLine: string;
  chordTokens: ChordToken[];
  lyricLine: string;
}

// Parse chord positions from a whitespace-aligned chord line
function parseChordTokens(line: string): ChordToken[] {
  const tokens: ChordToken[] = [];
  const regex = /\S+/g;
  let match;
  
  while ((match = regex.exec(line)) !== null) {
    const token = match[0];
    // Handle parenthesized content
    const inner = token.replace(/^\(|\)$/g, '');
    if (CHORD_REGEX.test(inner) || CHORD_REGEX.test(token)) {
      tokens.push({
        chord: token,
        position: match.index,
      });
    }
  }
  
  return tokens;
}


// Check if a line is all chords
function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  // Allow chord tokens, parentheses groups, 'x', and digits
  return tokens.every(t => {
    if (t === '-' || t === 'x' || /^\d+$/.test(t)) return true;
    if (t.startsWith('(') || t.endsWith(')')) {
      const inner = t.replace(/^\(|\)$/g, '');
      return !inner || CHORD_REGEX.test(inner);
    }
    return CHORD_REGEX.test(t);
  });
}

// Parse the song into chord-lyric pairs
function parseSong(text: string): { pairs: ParsedPair[]; directives: string[] } {
  const lines = text.split('\n');
  const pairs: ParsedPair[] = [];
  const directives: string[] = [];
  
  let i = 0;
  // Skip metadata (title, credits, empty line)
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '' && i > 0) {
      i++;
      break;
    }
    if (i === 0 || line.startsWith('מילים') || line.startsWith('לחן')) {
      i++;
      continue;
    }
    break;
  }
  
  // Parse content lines
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines
    if (trimmed === '') {
      i++;
      continue;
    }
    
    // Check if it's a directive like (Em G D Am)x2
    if (trimmed.startsWith('(') && trimmed.includes(')x')) {
      directives.push(trimmed);
      i++;
      continue;
    }
    
    // Check if current line is chords
    if (isChordLine(trimmed)) {
      const chordTokens = parseChordTokens(line);
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      
      // If next line exists and is NOT a chord line, pair them
      if (nextLine && !isChordLine(nextLine.trim()) && nextLine.trim() !== '') {
        pairs.push({
          chordLine: line,
          chordTokens,
          lyricLine: nextLine,
        });
        i += 2;
      } else {
        // Chord-only line (like "Em G D Am" without lyrics below)
        pairs.push({
          chordLine: line,
          chordTokens,
          lyricLine: '',
        });
        i++;
      }
    } else {
      // Lyric-only line
      pairs.push({
        chordLine: '',
        chordTokens: [],
        lyricLine: line,
      });
      i++;
    }
  }
  
  return { pairs, directives };
}

// ============================================
// APPROACH 1: DOM Measurement
// ============================================

interface DomApproachProps {
  pair: ParsedPair;
  keyOffset: number;
  font: string;
  fontSize: number;
}

function DomApproachPair({ pair, keyOffset, font, fontSize }: DomApproachProps) {
  const lyricRef = useRef<HTMLDivElement>(null);
  const [charOffsets, setCharOffsets] = useState<number[]>([]);
  
  // Transpose chords
  const transposedTokens = useMemo(() => {
    return pair.chordTokens.map(token => ({
      ...token,
      chord: transposeChord(token.chord, keyOffset),
    }));
  }, [pair.chordTokens, keyOffset]);
  
  // Measure character positions after render
  useLayoutEffect(() => {
    if (!lyricRef.current || !pair.lyricLine) return;
    
    const spans = lyricRef.current.querySelectorAll('span[data-char]');
    const offsets: number[] = [];
    const containerRect = lyricRef.current.getBoundingClientRect();
    
    spans.forEach((span) => {
      const rect = span.getBoundingClientRect();
      offsets.push(rect.left - containerRect.left);
    });
    
    setCharOffsets(offsets);
  }, [pair.lyricLine, font, fontSize]);
  
  // If no lyric line, just show chords inline
  if (!pair.lyricLine) {
    return (
      <div className="demo-pair dom-approach" style={{ fontFamily: font, fontSize: `${fontSize}px` }}>
        <div className="demo-chords-inline">
          {transposedTokens.map((token, i) => (
            <span key={i} className="demo-chord">{token.chord} </span>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="demo-pair dom-approach" style={{ fontFamily: font, fontSize: `${fontSize}px` }}>
      {/* Chord row - position each chord at its measured character position */}
      <div className="demo-chord-row" style={{ position: 'relative', height: '1.3em' }}>
        {transposedTokens.map((token, i) => {
          const leftOffset = charOffsets[token.position] ?? 0;
          return (
            <span
              key={i}
              className="demo-chord"
              style={{
                position: 'absolute',
                left: `${leftOffset}px`,
                whiteSpace: 'nowrap',
              }}
            >
              {token.chord}
            </span>
          );
        })}
      </div>
      {/* Lyric row - natural proportional text, each char wrapped for measurement */}
      <div className="demo-lyric-row" ref={lyricRef} style={{ whiteSpace: 'pre' }}>
        {pair.lyricLine.split('').map((char, idx) => (
          <span key={idx} data-char={idx}>
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================
// APPROACH 2: Canvas Measurement
// ============================================

interface CanvasApproachProps {
  pair: ParsedPair;
  keyOffset: number;
  font: string;
  fontSize: number;
}

function CanvasApproachPair({ pair, keyOffset, font, fontSize }: CanvasApproachProps) {
  // Transpose chords
  const transposedTokens = useMemo(() => {
    return pair.chordTokens.map(token => ({
      ...token,
      chord: transposeChord(token.chord, keyOffset),
    }));
  }, [pair.chordTokens, keyOffset]);
  
  // Measure text width using Canvas API
  const measureTextWidth = useCallback((text: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    ctx.font = `${fontSize}px ${font}`;
    return ctx.measureText(text).width;
  }, [font, fontSize]);
  
  // Calculate character offsets using canvas measurement
  const charOffsets = useMemo(() => {
    if (!pair.lyricLine) return [];
    const offsets: number[] = [];
    for (let i = 0; i < pair.lyricLine.length; i++) {
      offsets.push(measureTextWidth(pair.lyricLine.slice(0, i)));
    }
    return offsets;
  }, [pair.lyricLine, measureTextWidth]);
  
  // If no lyric line, just show chords inline
  if (!pair.lyricLine) {
    return (
      <div className="demo-pair canvas-approach" style={{ fontFamily: font, fontSize: `${fontSize}px` }}>
        <div className="demo-chords-inline">
          {transposedTokens.map((token, i) => (
            <span key={i} className="demo-chord">{token.chord} </span>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="demo-pair canvas-approach" style={{ fontFamily: font, fontSize: `${fontSize}px` }}>
      {/* Chord row - position each chord using canvas-measured offset */}
      <div className="demo-chord-row" style={{ position: 'relative', height: '1.3em' }}>
        {transposedTokens.map((token, i) => {
          const leftOffset = charOffsets[token.position] ?? 0;
          return (
            <span
              key={i}
              className="demo-chord"
              style={{
                position: 'absolute',
                left: `${leftOffset}px`,
                whiteSpace: 'nowrap',
              }}
            >
              {token.chord}
            </span>
          );
        })}
      </div>
      {/* Lyric row - natural proportional text rendering */}
      <div className="demo-lyric-row" style={{ whiteSpace: 'pre' }}>
        {pair.lyricLine}
      </div>
    </div>
  );
}

// ============================================
// Main Demo Component
// ============================================

const FONT_OPTIONS = [
  { name: 'Heebo', value: "'Heebo', sans-serif" },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Cousine (monospace)', value: "'Cousine', monospace" },
  { name: 'David Libre', value: "'David Libre', serif" },
  { name: 'Rubik', value: "'Rubik', sans-serif" },
];

export function AlignmentDemo() {
  const [keyOffset, setKeyOffset] = useState(0);
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0].value);
  const [fontSize, setFontSize] = useState(20);
  
  const { pairs } = useMemo(() => parseSong(RAW_SONG), []);
  
  return (
    <div className="alignment-demo">
      <div className="demo-header">
        <h1>Token-Based Chord Alignment Demo</h1>
        <p>Comparing DOM Measurement vs Canvas Measurement approaches</p>
      </div>
      
      <div className="demo-controls">
        <div className="control-group">
          <label>Transpose:</label>
          <button onClick={() => setKeyOffset(k => Math.max(-6, k - 1))}>▼</button>
          <span className="offset-display">{formatOffset(keyOffset)}</span>
          <button onClick={() => setKeyOffset(k => Math.min(6, k + 1))}>▲</button>
          <button onClick={() => setKeyOffset(0)} className="reset-btn">Reset</button>
        </div>
        
        <div className="control-group">
          <label>Font:</label>
          <select value={selectedFont} onChange={e => setSelectedFont(e.target.value)}>
            {FONT_OPTIONS.map(opt => (
              <option key={opt.name} value={opt.value}>{opt.name}</option>
            ))}
          </select>
        </div>
        
        <div className="control-group">
          <label>Size: {fontSize}px</label>
          <input
            type="range"
            min="14"
            max="32"
            value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
          />
        </div>
      </div>
      
      <div className="demo-comparison">
        {/* Approach 1: DOM Measurement */}
        <div className="demo-column">
          <h2>Approach 1: DOM Measurement</h2>
          <p className="approach-desc">
            Wraps each lyric character in a span, measures actual rendered positions,
            then positions chords absolutely. Most accurate but requires layout measurement.
          </p>
          <div className="demo-content ltr">
            {pairs.map((pair, i) => (
              <DomApproachPair
                key={i}
                pair={pair}
                keyOffset={keyOffset}
                font={selectedFont}
                fontSize={fontSize}
              />
            ))}
          </div>
        </div>
        
        {/* Approach 2: Canvas Measurement */}
        <div className="demo-column">
          <h2>Approach 2: Canvas Measurement</h2>
          <p className="approach-desc">
            Uses Canvas API to pre-calculate text widths without DOM manipulation.
            Faster but may have slight differences from actual rendering.
          </p>
          <div className="demo-content ltr">
            {pairs.map((pair, i) => (
              <CanvasApproachPair
                key={i}
                pair={pair}
                keyOffset={keyOffset}
                font={selectedFont}
                fontSize={fontSize}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Reference: Original monospace rendering */}
      <div className="demo-reference">
        <h2>Reference: Original Monospace Rendering</h2>
        <p className="approach-desc">
          Current approach using monospace font with space-based alignment.
        </p>
        <div className="demo-content ltr monospace-ref" style={{ fontSize: `${fontSize}px` }}>
          <pre>{RAW_SONG}</pre>
        </div>
      </div>
    </div>
  );
}


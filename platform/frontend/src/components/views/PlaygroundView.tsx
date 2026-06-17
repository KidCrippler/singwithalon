import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { songsApi } from '../../services/api';
import type { ParsedSong } from '../../types';
import { computeAutoFit } from '../../utils/autoFitAnalytic';
import { useAutoFitOffscreen } from '../../hooks/useAutoFitOffscreen';
import { ChordSheet } from './ChordSheet';

// ---------------------------------------------------------------------------
// Playground - dev scratch page (route /tools/playground) for the chord
// renderer. This is the harness the renderer + auto-fit calculators were built
// and are verified in; it ships no production behaviour of its own.
//
// This view owns the controls (pick a song, toggle proportional/mono font, font
// size, column count, run an auto-fit calculator) and fetches the song; the
// actual chord-sheet rendering lives in the reusable <ChordSheet /> component.
// State lives in the URL (`song`, `font`, `size`, `cols`, `overlap`).
//
// Subsystem overview (renderer, both calculators, shared placement core):
// ../../../CHORDSHEET.md (platform/CHORDSHEET.md).
// ---------------------------------------------------------------------------

const DEFAULT_SONG_ID = 1000366;
const DEFAULT_FONT_SIZE = 20;
const DEFAULT_COLUMNS = 2;
// Songs are rendered untransposed in the playground.
const KEY_OFFSET = 0;
// Column gap shared by the visible sheet and the auto-fit measurement, so the
// computed fit matches what renders.
const COLUMN_GAP = 40;

// Quick-switch test songs covering both directions and the tricky alignment
// cases (RTL long-chord-line, LTR indented lyrics). See SPEC / project memory.
const TEST_SONG_IDS = [2000598, 4000137, 1000366];

export function PlaygroundView() {
  const [params, setParams] = useSearchParams();
  const songId = Number(params.get('song')) || DEFAULT_SONG_ID;
  const font = params.get('font') === 'mono' ? 'mono' : 'proportional';
  const fontSize = Number(params.get('size')) || DEFAULT_FONT_SIZE;
  const columns = Number(params.get('cols')) || DEFAULT_COLUMNS;
  // Debug overlay: outline every rendered lyric/chord row to spot overlaps.
  const showOverlap = params.get('overlap') === '1';

  const [song, setSong] = useState<ParsedSong | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Titles of the quick-switch test songs, fetched once for nicer buttons.
  const [titles, setTitles] = useState<Record<number, string>>({});

  // Measure the rendered-song region (<main>) - this box is the "one screen"
  // the song must fit into for auto-fit.
  const mainRef = useRef<HTMLElement | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const measure = () =>
      setViewport({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Debug overlay boxes: one per chord/lyric row. A row's wrapper box doesn't
  // include its chords (they're absolutely positioned), so a CSS outline misses
  // overhangs. Instead we measure each row's union rect (wrapper + its chord
  // spans) relative to <main> and draw one box that truly encloses the combo.
  const [overlapBoxes, setOverlapBoxes] = useState<
    { left: number; top: number; width: number; height: number }[]
  >([]);
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!showOverlap || !el) {
      setOverlapBoxes([]);
      return;
    }
    const measure = () => {
      // The sheet is the non-absolute child (the overlay boxes are absolute).
      const sheet = [...el.children].find(
        (c) => getComputedStyle(c).position !== 'absolute'
      );
      if (!sheet) return setOverlapBoxes([]);
      const base = el.getBoundingClientRect();
      const boxes = [...sheet.children].map((row) => {
        let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
        // Union the row wrapper with all its (possibly overhanging) chord spans.
        const parts = [row, ...row.querySelectorAll('span[style*="absolute"]')];
        for (const p of parts) {
          const rc = p.getBoundingClientRect();
          l = Math.min(l, rc.left); t = Math.min(t, rc.top);
          r = Math.max(r, rc.right); b = Math.max(b, rc.bottom);
        }
        // 1px pad so sub-pixel rounding never visually clips a chord's edge.
        const PAD = 1;
        return {
          left: l - base.left + el.scrollLeft - PAD,
          top: t - base.top + el.scrollTop - PAD,
          width: r - l + PAD * 2,
          height: b - t + PAD * 2,
        };
      });
      setOverlapBoxes(boxes);
    };

    // Re-measure after this change settles, AND on any later layout change while
    // overlap is on: changing size/columns/font re-renders the sheet, and its
    // chords place asynchronously (a second layout pass), so a one-shot measure
    // can race it. A ResizeObserver on the sheet + a settle frame keep the boxes
    // in sync with whatever is actually rendered.
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => requestAnimationFrame(measure));
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    const sheet = [...el.children].find(
      (c) => getComputedStyle(c).position !== 'absolute'
    );
    if (sheet) ro.observe(sheet);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [showOverlap, song, font, fontSize, columns]);

  // The offscreen calculator runs only while `enabled`; we flip it on for a
  // single run, capture its result into the manual size/cols, then turn it off.
  const [offscreenRunning, setOffscreenRunning] = useState(false);
  const offscreenFit = useAutoFitOffscreen({
    song,
    keyOffset: KEY_OFFSET,
    font,
    viewport,
    gap: COLUMN_GAP,
    enabled: offscreenRunning,
  });

  useEffect(() => {
    let alive = true;
    setSong(null);
    setError(null);
    songsApi
      .getLyrics(songId)
      .then((s) => {
        if (alive) setSong(s);
      })
      .catch((e) => {
        if (alive) setError(e?.message || 'Failed to load song');
      });
    return () => {
      alive = false;
    };
  }, [songId]);

  // Fetch the test songs' titles once so the quick-switch buttons can show names.
  useEffect(() => {
    let alive = true;
    Promise.all(
      TEST_SONG_IDS.map((id) =>
        songsApi
          .getLyrics(id)
          .then((s) => [id, s.metadata.title] as const)
          .catch(() => [id, String(id)] as const)
      )
    ).then((pairs) => {
      if (alive) setTitles(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, []);

  const applyFit = (size: number, cols: number) => {
    const p = new URLSearchParams(params);
    p.set('size', String(size));
    p.set('cols', String(cols));
    setParams(p, { replace: true });
  };

  // When the one-shot offscreen run produces a result, apply it and stop.
  useEffect(() => {
    if (offscreenRunning && offscreenFit.result) {
      applyFit(offscreenFit.result.fontSize, offscreenFit.result.columns);
      setOffscreenRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offscreenRunning, offscreenFit.result]);

  const setSongId = (v: string) => {
    const n = Number(v);
    const p = new URLSearchParams(params);
    if (n) p.set('song', String(n));
    setParams(p, { replace: true });
  };

  const bumpSize = (delta: number) => {
    const p = new URLSearchParams(params);
    p.set('size', String(Math.max(8, fontSize + delta)));
    setParams(p, { replace: true });
  };

  const bumpCols = (delta: number) => {
    const p = new URLSearchParams(params);
    p.set('cols', String(Math.max(1, columns + delta)));
    setParams(p, { replace: true });
  };

  // Run the math (canvas/analytic) calculator once and apply the result.
  const runMathFit = () => {
    if (!song || viewport.width <= 0 || viewport.height <= 0) return;
    const r = computeAutoFit({
      song,
      keyOffset: KEY_OFFSET,
      font,
      viewport,
      gap: COLUMN_GAP,
    });
    applyFit(r.fontSize, r.columns);
  };

  // Auto-run the math fit once per (song, font) so picking a song OR switching
  // mono/proportional lands on a fitted size/cols immediately (the user can still
  // bump them afterward - we key off the loaded song object plus the font, so a
  // manual bump that changes neither doesn't re-trigger). Waits for the viewport
  // to be measured. The offscreen fit stays manual (it's the slow probe).
  const autoFitDoneFor = useRef<{
    song: ParsedSong;
    font: 'proportional' | 'mono';
  } | null>(null);
  useEffect(() => {
    if (!song || viewport.width <= 0 || viewport.height <= 0) return;
    const done = autoFitDoneFor.current;
    if (done && done.song === song && done.font === font) return;
    autoFitDoneFor.current = { song, font };
    runMathFit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song, font, viewport.width, viewport.height]);

  const setFont = (v: 'proportional' | 'mono') => {
    const p = new URLSearchParams(params);
    p.set('font', v);
    setParams(p, { replace: true });
  };

  const toggleOverlap = () => {
    const p = new URLSearchParams(params);
    p.set('overlap', showOverlap ? '0' : '1');
    setParams(p, { replace: true });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 24,
        padding: 24,
        // Bound the row to the viewport so <main> has a real, fixed height to
        // fit the song into (auto-fit needs a finite height; an auto-height main
        // would make "fits vertically" trivially true at any font size).
        height: '100vh',
        boxSizing: 'border-box',
      }}
    >
      {/* --- controls sidebar --- */}
      <aside
        style={{
          flex: '0 0 220px',
          alignSelf: 'flex-start',
          position: 'sticky',
          top: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          fontFamily: "'Heebo', sans-serif",
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label>Song ID</label>
          <input
            key={songId}
            type="number"
            defaultValue={songId}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setSongId((e.target as HTMLInputElement).value);
            }}
            style={{ width: '100%', padding: '4px 8px' }}
          />
          {/* Quick-switch buttons for the RTL/LTR test songs (see SPEC / memory),
              one per line, labelled by song name. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {TEST_SONG_IDS.map((id) => (
              <button
                key={id}
                onClick={() => setSongId(String(id))}
                style={{
                  padding: '4px 10px',
                  textAlign: 'right',
                  fontWeight: id === songId ? 700 : 400,
                  background: id === songId ? '#e6f0ff' : undefined,
                }}
              >
                {titles[id] ?? id}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label>Font</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['proportional', 'mono'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFont(f)}
                style={{
                  padding: '4px 10px',
                  fontWeight: f === font ? 700 : 400,
                  background: f === font ? '#e6f0ff' : undefined,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label>Debug</label>
          <button
            onClick={toggleOverlap}
            style={{
              padding: '4px 10px',
              fontWeight: showOverlap ? 700 : 400,
              background: showOverlap ? '#e6f0ff' : undefined,
            }}
          >
            {showOverlap ? 'hide overlap' : 'show overlap'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label>Auto-fit (run once)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={runMathFit} style={{ padding: '4px 10px' }}>
              math
            </button>
            <button
              onClick={() => setOffscreenRunning(true)}
              disabled={offscreenRunning}
              style={{ padding: '4px 10px' }}
            >
              {offscreenRunning ? 'offscreen…' : 'offscreen'}
            </button>
          </div>
        </div>

        <Stepper label="Size" value={fontSize} onBump={bumpSize} />
        <Stepper label="Columns" value={columns} onBump={bumpCols} />

        {song && (
          <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
            {`${song.metadata.title} - ${song.metadata.artist}`}
          </div>
        )}

        {/* Debug: measured main-area size the auto-fit fits the song into. */}
        <div style={{ color: '#aaa', fontSize: 12, marginTop: 'auto' }}>
          {`main: ${Math.round(viewport.width)} × ${Math.round(viewport.height)} px`}
        </div>
      </aside>

      {/* --- rendered song --- */}
      <main
        ref={mainRef}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          position: 'relative', // anchor for the debug overlay boxes
          // The "one screen": the song must fit here without scrolling.
          overflow: 'hidden',
        }}
      >
        {/* Debug overlay: one box per chord/lyric row, measured to enclose the
            full combo (lyric + any overhanging chords). */}
        {showOverlap &&
          overlapBoxes.map((box, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                outline: '1px solid rgba(220,20,60,0.6)',
                pointerEvents: 'none',
              }}
            />
          ))}
        {error ? (
          <div style={{ color: '#dc143c' }}>{error}</div>
        ) : !song ? (
          <div>Loading...</div>
        ) : (
          <ChordSheet
            song={song}
            keyOffset={KEY_OFFSET}
            font={font}
            fontSize={fontSize}
            columns={columns}
            columnGap={COLUMN_GAP}
          />
        )}
      </main>
    </div>
  );
}

/** A labeled -/value/+ stepper row for the controls sidebar. */
function Stepper({
  label,
  value,
  onBump,
}: {
  label: string;
  value: number;
  onBump: (delta: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => onBump(-1)} style={{ padding: '4px 12px' }}>
          -
        </button>
        <span style={{ minWidth: 28, textAlign: 'center' }}>{String(value)}</span>
        <button onClick={() => onBump(1)} style={{ padding: '4px 12px' }}>
          +
        </button>
      </div>
    </div>
  );
}

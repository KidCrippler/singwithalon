import { useLayoutEffect, useRef, useState } from 'react';
import type { ParsedSong } from '../../types';
import { ChordSheet } from './ChordSheet';
import { useAutoFitAnalytic } from '../../hooks/useAutoFitAnalytic';

// ---------------------------------------------------------------------------
// Screen adapter for <ChordSheet />. It measures the space it's given and runs
// the analytic auto-fit (useAutoFitAnalytic) to pick the (columns, fontSize)
// that fits the whole song on one screen at the largest readable size - the
// same job useDynamicFontSize does for the classic renderer, but computed the
// way the playground does it for ChordSheet. Font is fixed to 'proportional'.
// ---------------------------------------------------------------------------

// Column gap shared by the rendered sheet and the auto-fit measurement, so the
// computed fit matches what renders (mirrors PlaygroundView's COLUMN_GAP).
const COLUMN_GAP = 40;

interface ChordSheetAutoFitProps {
  song: ParsedSong;
  keyOffset?: number;
  isLineHighlighted?: (lineIndex: number) => boolean;
  onLineClick?: (lineIndex: number) => void;
}

export function ChordSheetAutoFit({
  song,
  keyOffset = 0,
  isLineHighlighted,
  onLineClick,
}: ChordSheetAutoFitProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  // Available box = full container width, and height from the container's top to
  // the bottom of the viewport. We must NOT use clientHeight: this container is a
  // flex item that grows to its content, so clientHeight === scrollHeight and the
  // fit would size a box taller than the screen (same reasoning as
  // useDynamicFontSize). The top offset is stable, so innerHeight - top is the
  // true visible height.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      setViewport({
        width: el.clientWidth,
        height: Math.max(0, window.innerHeight - top),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const fit = useAutoFitAnalytic({
    song,
    keyOffset,
    font: 'proportional',
    viewport,
    gap: COLUMN_GAP,
  });

  return (
    // Owns its own box: fills the available area (flex child of the chord screen)
    // and establishes NO CSS multi-column context of its own, so ChordSheet's
    // internal columns are the only ones. (Rendering inside .lyrics-container -
    // which has its own column-count/column-rule - nests two column engines and
    // flows the whole sheet into a fraction of the box.)
    <div
      ref={ref}
      style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        overflow: 'clip',
        background: 'white',
      }}
    >
      {fit && (
        <ChordSheet
          song={song}
          keyOffset={keyOffset}
          columns={fit.columns}
          fontSize={fit.fontSize}
          columnGap={COLUMN_GAP}
          font="proportional"
          isLineHighlighted={isLineHighlighted}
          onLineClick={onLineClick}
        />
      )}
    </div>
  );
}

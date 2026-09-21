import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatOffset, keyOptions, targetKeyName } from '../services/transpose';

interface SongKeyControlProps {
  writtenKey?: string;          // song.key from the index; absent for image-only/chord-less charts
  keyOffset: number;            // saved semitone offset (0 = as written)
  songName: string;
  keyShiftToOriginal?: number;  // offset to the original recording's key, if known
  onChange: (offset: number) => void;
}

// Per-row key picker in the playlist screen. Shows a compact pill; tapping it opens
// an anchored popover — a 12-key grid when the written key is known, a ± stepper when not.
// The popover renders in a portal so it escapes the row's opacity (played rows are dimmed)
// and stacking context, and always paints opaque on the topmost layer.
export function SongKeyControl({ writtenKey, keyOffset, songName, keyShiftToOriginal, onChange }: SongKeyControlProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const pillRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Anchor the fixed-position popover under the pill, growing rightward from it.
  // Clamp so it never runs off the right edge of the viewport.
  useLayoutEffect(() => {
    if (!open || !pillRef.current) return;
    const rect = pillRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 228));
    setPos({ top: rect.bottom + 4, left });
  }, [open]);

  // Close on outside click, and on scroll/resize (so it doesn't drift from the pill).
  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!pillRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onReflow = () => setOpen(false);
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open]);

  const options = writtenKey ? keyOptions(writtenKey) : null;
  const reKeyed = keyOffset !== 0;
  const label = options && writtenKey ? targetKeyName(writtenKey, keyOffset) : formatOffset(keyOffset);
  const pillState = !options ? 'unknown' : reKeyed ? 'rekeyed' : 'as-written';
  const ariaLabel = options && writtenKey
    ? `מפתח: ${targetKeyName(writtenKey, keyOffset)}`
    : `שינוי גובה: ${formatOffset(keyOffset)}`;

  const pick = (offset: number) => {
    onChange(offset);
    setOpen(false);
  };

  const popover = (
    <div
      className="song-key-popover"
      ref={popoverRef}
      style={{ top: pos.top, left: pos.left }}
      onClick={e => e.stopPropagation()}
    >
      {options ? (
        <>
          <div className="song-key-popover-title">מפתח ל"{songName}" (מקור: {writtenKey})</div>
          <div className="song-key-grid">
            {options.map(opt => (
              <button
                key={opt.name}
                className={`song-key-cell ${opt.offset === keyOffset ? 'selected' : ''} ${opt.offset === 0 ? 'written' : ''}`}
                aria-pressed={opt.offset === keyOffset}
                onClick={() => pick(opt.offset)}
              >
                {opt.name}
              </button>
            ))}
          </div>
          <div className="song-key-actions">
            <button className="song-key-action" onClick={() => pick(0)}>↩ החזר למקור</button>
            {keyShiftToOriginal !== undefined && keyShiftToOriginal !== 0 && (
              <button className="song-key-action" onClick={() => pick(keyShiftToOriginal)}>
                → מקור ההקלטה {formatOffset(keyShiftToOriginal)}
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="song-key-popover-title">שינוי גובה "{songName}"</div>
          <div className="song-key-stepper">
            <button className="song-key-step" onClick={() => onChange(keyOffset - 1)} aria-label="הורד">−</button>
            <span className="song-key-step-value">{formatOffset(keyOffset)}</span>
            <button className="song-key-step" onClick={() => onChange(keyOffset + 1)} aria-label="העלה">+</button>
          </div>
          <div className="song-key-actions">
            <button className="song-key-action" onClick={() => pick(0)}>↩ 0</button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="song-key-control">
      <button
        ref={pillRef}
        className={`song-key-pill ${pillState}`}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        aria-label={ariaLabel}
        title={reKeyed ? formatOffset(keyOffset) : undefined}
      >
        {label}
      </button>
      {open && createPortal(popover, document.body)}
    </div>
  );
}

import { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { LineDisplay } from '../../../common/LineDisplay';
import { filterForLyricsMode } from '../../../../utils/verseCalculator';
import type { ParsedSong, ParsedLine } from '../../../../types';
import type { VerseRange } from '../../../../utils/verseCalculator';

interface ViewerZoomableVerseDisplayProps {
  lyrics: ParsedSong;
  verses: VerseRange[];
  currentVerseIndex: number;
  isRtl: boolean;
}

interface VerseMeasurement {
  top: number;
  height: number;
  maxLineWidth: number;
}

interface VerseLineInfo {
  line: ParsedLine;
  originalIndex: number;
  isContextLine?: boolean;
}

/**
 * Get lines for a verse, filtered for lyrics mode.
 * When this verse is immediately before the current verse, marks the last
 * line(s) as context lines (they stay in this block but render at 0.4 opacity
 * to provide continuity for the next verse).
 */
function getVerseDisplayLines(
  lines: ParsedLine[],
  verses: VerseRange[],
  verseIndex: number,
  currentVerseIndex: number
): VerseLineInfo[] {
  const verse = verses[verseIndex];
  const verseLines = lines.slice(verse.startIndex, verse.endIndex + 1);
  const filtered = filterForLyricsMode(verseLines, false);

  // Determine how many trailing lines to mark as context
  // (only when this verse is immediately before the current one)
  const MIN_VISIBLE_LINES = 8;
  let contextCount = 0;
  if (currentVerseIndex > 0 && verseIndex === currentVerseIndex - 1 && filtered.length > 0) {
    // Count how many lines the current (next) verse has
    const nextVerse = verses[currentVerseIndex];
    const nextVerseLines = lines.slice(nextVerse.startIndex, nextVerse.endIndex + 1);
    const nextFiltered = filterForLyricsMode(nextVerseLines, false);
    const nextLineCount = nextFiltered.length;

    if (currentVerseIndex === verses.length - 1 && nextLineCount < MIN_VISIBLE_LINES) {
      // Last verse: pad to MIN_VISIBLE_LINES with context from previous verse
      contextCount = Math.min(MIN_VISIBLE_LINES - nextLineCount, filtered.length);
    } else {
      // Normal case: just 1 context line (or 2 if last is empty)
      const lastLine = filtered[filtered.length - 1];
      contextCount = (lastLine.type === 'empty' && filtered.length >= 2) ? 2 : 1;
    }
  }
  const contextFromIndex = filtered.length - contextCount;

  const result: VerseLineInfo[] = [];
  let origIdx = verse.startIndex;

  for (let i = 0; i < filtered.length; i++) {
    const line = filtered[i];
    while (origIdx <= verse.endIndex && lines[origIdx] !== line) {
      origIdx++;
    }

    result.push({
      line,
      originalIndex: origIdx,
      isContextLine: i >= contextFromIndex,
    });

    origIdx++;
  }

  return result;
}

export function ViewerZoomableVerseDisplay({
  lyrics,
  verses,
  currentVerseIndex,
  isRtl,
}: ViewerZoomableVerseDisplayProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const transformContainerRef = useRef<HTMLDivElement>(null);
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState({ translateY: 0, scale: 1 });

  const prevVerseIndexRef = useRef<number>(currentVerseIndex);
  const prevLyricsRef = useRef<ParsedSong | null>(null);
  const lastTransformRef = useRef({ translateY: 0, scale: 1 });

  // Track viewport size
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSize = () => {
      setViewportSize({
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  // Measure all verses and apply transform in a single layout effect.
  // This runs synchronously before the browser paints, preventing flashes.
  useLayoutEffect(() => {
    const container = transformContainerRef.current;
    if (!container || viewportSize.width === 0 || viewportSize.height === 0) return;

    // --- Measure ---
    const originalTransition = container.style.transition;
    container.style.transition = 'none';
    container.style.transform = 'scale(1) translateY(0)';
    void container.offsetHeight;

    const newMeasurements: VerseMeasurement[] = verseRefs.current.map((ref) => {
      if (!ref) return { top: 0, height: 0, maxLineWidth: 0 };

      const top = ref.offsetTop;
      const height = ref.offsetHeight;

      let maxLineWidth = 0;
      const lineDisplays = ref.querySelectorAll('.line-display');
      lineDisplays.forEach((lineDisplay) => {
        const textSpans = lineDisplay.querySelectorAll('.lyric, .cue');
        textSpans.forEach((span) => {
          const rect = span.getBoundingClientRect();
          maxLineWidth = Math.max(maxLineWidth, rect.width);
        });
      });

      return { top, height, maxLineWidth };
    });

    // Measure context line height from the previous verse block
    let contextLineHeight = 0;
    if (currentVerseIndex > 0) {
      const prevRef = verseRefs.current[currentVerseIndex - 1];
      if (prevRef) {
        prevRef.querySelectorAll('.context-line').forEach((el) => {
          contextLineHeight += (el as HTMLElement).offsetHeight;
        });
      }
    }

    // --- Calculate target transform ---
    const calcTransform = (verseIndex: number) => {
      if (verseIndex < 0 || verseIndex >= newMeasurements.length) {
        return { translateY: 0, scale: 1 };
      }
      const verse = newMeasurements[verseIndex];
      if (verse.height === 0) {
        return { translateY: 0, scale: 1 };
      }

      // Total visible height: current verse + context lines from previous block
      const ctxH = verseIndex === currentVerseIndex ? contextLineHeight : 0;
      const totalHeight = verse.height + ctxH;

      const scaleX = verse.maxLineWidth > 0 ? (viewportSize.width * 0.95) / verse.maxLineWidth : 10;
      const scaleY = (viewportSize.height * 0.90) / totalHeight;
      const scale = Math.max(0.3, Math.min(scaleX, scaleY, 3));

      // Center the combined region (context lines + current verse)
      const regionTop = verse.top - ctxH;
      const regionCenterY = regionTop + totalHeight / 2;
      const viewportCenterY = viewportSize.height / 2;
      const translateY = viewportCenterY / scale - regionCenterY;

      return { translateY, scale };
    };

    const target = calcTransform(currentVerseIndex);
    const verseChanged = prevVerseIndexRef.current !== currentVerseIndex;
    const lyricsChanged = prevLyricsRef.current !== lyrics;
    const needsAnimation = verseChanged || lyricsChanged;

    if (needsAnimation) {
      // Jump to last known position (before DOM changed), then animate to target
      const start = lastTransformRef.current;
      container.style.transform = `scale(${start.scale}) translateY(${start.translateY}px)`;
      void container.offsetHeight;
      prevVerseIndexRef.current = currentVerseIndex;
      prevLyricsRef.current = lyrics;
    }

    // Restore transition, then apply target transform directly on the DOM
    container.style.transition = originalTransition || '';
    container.style.transform = `scale(${target.scale}) translateY(${target.translateY}px)`;

    lastTransformRef.current = target;
    setTransform(target);
  }, [lyrics, verses, viewportSize, currentVerseIndex]);

  if (verseRefs.current.length !== verses.length) {
    verseRefs.current = verses.map((_, i) => verseRefs.current[i] || null);
  }

  return (
    <div
      ref={viewportRef}
      className={`verse-viewport ${isRtl ? 'rtl' : 'ltr'}`}
    >
      <div
        ref={transformContainerRef}
        className="verse-zoom-transform"
        style={{
          transform: `scale(${transform.scale}) translateY(${transform.translateY}px)`,
        }}
      >
        <div className="verse-all-container">
          {verses.map((_, verseIndex) => {
            const isCurrent = verseIndex === currentVerseIndex;
            const verseLines = getVerseDisplayLines(lyrics.lines, verses, verseIndex, currentVerseIndex);

            return (
              <div
                key={verseIndex}
                ref={(el) => {
                  verseRefs.current[verseIndex] = el;
                }}
                className={`verse-block ${isCurrent ? 'verse-current' : 'verse-other'}`}
                data-verse-index={verseIndex}
              >
                {verseLines.map((lineInfo, lineIndex) => (
                  <div
                    key={lineIndex}
                    className={`line-display${lineInfo.isContextLine ? ' context-line' : ''}`}
                  >
                    <LineDisplay
                      line={lineInfo.line}
                      showChords={false}
                      lineIndex={lineInfo.originalIndex}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

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
 *
 * Context lines provide continuity (rendered at reduced opacity in their own
 * verse block — no duplication):
 * - For non-last current verse: the first line(s) of the NEXT verse block are
 *   marked as context lines.
 * - For the last current verse: the last line(s) of the PREVIOUS verse block
 *   are marked as context lines.
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

  const isLastVerse = currentVerseIndex === verses.length - 1;
  const MIN_VISIBLE_LINES = 8;

  // Determine which leading lines to mark as context
  // (when this verse is immediately AFTER the current non-last verse)
  let leadingContextCount = 0;
  if (!isLastVerse && verseIndex === currentVerseIndex + 1 && filtered.length > 0) {
    leadingContextCount = 1;
    if (filtered[0].type === 'empty' && filtered.length >= 2) {
      leadingContextCount = 2;
    }
  }

  // Determine which trailing lines to mark as context
  // (when this verse is immediately BEFORE the current last verse)
  let trailingContextCount = 0;
  if (isLastVerse && currentVerseIndex > 0 && verseIndex === currentVerseIndex - 1 && filtered.length > 0) {
    const currentVerse = verses[currentVerseIndex];
    const currentVerseLines = lines.slice(currentVerse.startIndex, currentVerse.endIndex + 1);
    const currentFiltered = filterForLyricsMode(currentVerseLines, false);

    if (currentFiltered.length < MIN_VISIBLE_LINES) {
      trailingContextCount = Math.min(MIN_VISIBLE_LINES - currentFiltered.length, filtered.length);
    } else {
      const lastLine = filtered[filtered.length - 1];
      trailingContextCount = (lastLine.type === 'empty' && filtered.length >= 2) ? 2 : 1;
    }
  }
  const trailingContextFromIndex = filtered.length - trailingContextCount;

  const result: VerseLineInfo[] = [];
  let origIdx = verse.startIndex;

  for (let i = 0; i < filtered.length; i++) {
    const line = filtered[i];
    while (origIdx <= verse.endIndex && lines[origIdx] !== line) {
      origIdx++;
    }

    const isContext = i < leadingContextCount || i >= trailingContextFromIndex;

    result.push({
      line,
      originalIndex: origIdx,
      isContextLine: isContext,
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

    // Measure context line height + max width from adjacent verse blocks
    let contextLineHeightAbove = 0;
    let contextMaxLineWidthAbove = 0;
    let contextLineHeightBelow = 0;
    let contextMaxLineWidthBelow = 0;
    const isLastVerse = currentVerseIndex === verses.length - 1;

    // Context lines from the PREVIOUS verse block (last verse only — trailing context)
    if (isLastVerse && currentVerseIndex > 0) {
      const prevRef = verseRefs.current[currentVerseIndex - 1];
      if (prevRef) {
        prevRef.querySelectorAll('.context-line').forEach((el) => {
          contextLineHeightAbove += (el as HTMLElement).offsetHeight;
          const textSpans = el.querySelectorAll('.lyric, .cue');
          textSpans.forEach((span) => {
            contextMaxLineWidthAbove = Math.max(contextMaxLineWidthAbove, span.getBoundingClientRect().width);
          });
        });
      }
    }

    // Context lines from the NEXT verse block (non-last verses — leading context)
    if (!isLastVerse && currentVerseIndex + 1 < verses.length) {
      const nextRef = verseRefs.current[currentVerseIndex + 1];
      if (nextRef) {
        nextRef.querySelectorAll('.context-line').forEach((el) => {
          contextLineHeightBelow += (el as HTMLElement).offsetHeight;
          const textSpans = el.querySelectorAll('.lyric, .cue');
          textSpans.forEach((span) => {
            contextMaxLineWidthBelow = Math.max(contextMaxLineWidthBelow, span.getBoundingClientRect().width);
          });
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

      // Total visible height: current verse + context lines from adjacent blocks
      const ctxAbove = verseIndex === currentVerseIndex ? contextLineHeightAbove : 0;
      const ctxBelow = verseIndex === currentVerseIndex ? contextLineHeightBelow : 0;
      const totalHeight = verse.height + ctxAbove + ctxBelow;

      // Max width must also account for context lines (they may be wider than current verse lines)
      const maxWidth = verseIndex === currentVerseIndex
        ? Math.max(verse.maxLineWidth, contextMaxLineWidthAbove, contextMaxLineWidthBelow)
        : verse.maxLineWidth;

      const scaleX = maxWidth > 0 ? (viewportSize.width * 0.95) / maxWidth : 10;
      const scaleY = (viewportSize.height * 0.90) / totalHeight;
      const scale = Math.max(0.3, Math.min(scaleX, scaleY, 3));

      // Center the combined region (context lines above + current verse + context lines below)
      const regionTop = verse.top - ctxAbove;
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

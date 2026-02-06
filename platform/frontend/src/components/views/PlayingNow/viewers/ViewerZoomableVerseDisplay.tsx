import { useRef, useState, useLayoutEffect, useCallback, useEffect } from 'react';
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
}

/**
 * Get lines for a verse, filtered for lyrics mode.
 */
function getVerseDisplayLines(
  lines: ParsedLine[],
  verses: VerseRange[],
  verseIndex: number
): VerseLineInfo[] {
  const verse = verses[verseIndex];
  const verseLines = lines.slice(verse.startIndex, verse.endIndex + 1);
  const filtered = filterForLyricsMode(verseLines, false);

  const result: VerseLineInfo[] = [];
  let origIdx = verse.startIndex;

  for (const line of filtered) {
    while (origIdx <= verse.endIndex && lines[origIdx] !== line) {
      origIdx++;
    }

    result.push({
      line,
      originalIndex: origIdx,
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
  const [measurements, setMeasurements] = useState<VerseMeasurement[]>([]);
  const [transform, setTransform] = useState({ translateY: 0, scale: 1 });

  const prevVerseIndexRef = useRef<number>(currentVerseIndex);

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

  // Measure all verses - only depends on lyrics, verses, and viewportSize
  useLayoutEffect(() => {
    const measureVerses = () => {
      const transformContainer = transformContainerRef.current;
      if (!transformContainer) return;

      // Save current transform and disable transition
      const originalTransform = transformContainer.style.transform;
      const originalTransition = transformContainer.style.transition;
      transformContainer.style.transition = 'none';
      transformContainer.style.transform = 'scale(1) translateY(0)';

      void transformContainer.offsetHeight;

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

      // Restore transform
      transformContainer.style.transform = originalTransform;
      transformContainer.style.transition = originalTransition;

      setMeasurements(newMeasurements);
    };

    const timer = setTimeout(measureVerses, 50);
    return () => clearTimeout(timer);
  }, [lyrics, verses, viewportSize]);

  const calculateTransform = useCallback(
    (verseIndex: number) => {
      if (
        measurements.length === 0 ||
        verseIndex < 0 ||
        verseIndex >= measurements.length ||
        viewportSize.width === 0 ||
        viewportSize.height === 0
      ) {
        return { translateY: 0, scale: 1 };
      }

      const verse = measurements[verseIndex];
      if (verse.height === 0) {
        return { translateY: 0, scale: 1 };
      }

      const scaleX = verse.maxLineWidth > 0 ? (viewportSize.width * 0.95) / verse.maxLineWidth : 10;
      const scaleY = (viewportSize.height * 0.90) / verse.height;
      const scale = Math.max(0.3, Math.min(scaleX, scaleY, 3));

      const verseCenterY = verse.top + verse.height / 2;
      const viewportCenterY = viewportSize.height / 2;
      const translateY = viewportCenterY / scale - verseCenterY;

      return { translateY, scale };
    },
    [measurements, viewportSize]
  );

  // Animate from previous verse position to new verse position
  useEffect(() => {
    const container = transformContainerRef.current;
    if (!container || measurements.length === 0) return;

    const prevIndex = prevVerseIndexRef.current;
    const newIndex = currentVerseIndex;
    const targetTransform = calculateTransform(newIndex);

    if (prevIndex !== newIndex) {
      const startTransform = calculateTransform(prevIndex);

      // Jump to start position without transition
      container.style.transition = 'none';
      container.style.transform = `scale(${startTransform.scale}) translateY(${startTransform.translateY}px)`;

      // Force reflow
      void container.offsetHeight;

      // Re-enable transition and animate to target
      container.style.transition = '';

      prevVerseIndexRef.current = newIndex;
    }

    setTransform(targetTransform);
  }, [currentVerseIndex, calculateTransform, measurements]);

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
            const verseLines = getVerseDisplayLines(lyrics.lines, verses, verseIndex);

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
                  <div key={lineIndex} className="line-display">
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

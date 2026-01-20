import { useState, useRef, useEffect, useMemo } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { calculateVersesForLyricsMode, filterForLyricsMode, type VerseRange } from '../../utils/experimentalVerseCalculator';
import type { ParsedLine } from '../../types';
import './ScrollDemoView.css';

// Realistic song with ~50 lines, including empty lines
// This simulates an actual Hebrew song structure
const DEMO_SONG_LINES: ParsedLine[] = [
  { type: 'lyric', text: 'בוקר של יום חדש מתחיל' },
  { type: 'lyric', text: 'השמש זורחת מעל הגבעות' },
  { type: 'lyric', text: 'ציפורים שרות בענפים' },
  { type: 'lyric', text: 'והעולם מתעורר לאט' },
  { type: 'empty', text: '' },
  { type: 'lyric', text: 'אני הולך בשביל הצר' },
  { type: 'lyric', text: 'בין העצים והפרחים' },
  { type: 'lyric', text: 'הרוח מלטפת את הפנים' },
  { type: 'lyric', text: 'והלב מתמלא בשמחה' },
  { type: 'lyric', text: 'זה הרגע שחיכיתי לו' },
  { type: 'empty', text: '' },
  { type: 'lyric', text: 'בכל פעם מחדש אני מגלה' },
  { type: 'lyric', text: 'את היופי שבדברים הפשוטים' },
  { type: 'lyric', text: 'טיפת טל על עלה' },
  { type: 'lyric', text: 'ניחוח של פרחים באוויר' },
  { type: 'lyric', text: 'זה הקסם של החיים' },
  { type: 'empty', text: '' },
  { type: 'lyric', text: 'אנשים עוברים לידי' },
  { type: 'lyric', text: 'כל אחד עם הסיפור שלו' },
  { type: 'lyric', text: 'חיוכים ודמעות' },
  { type: 'lyric', text: 'שמחות וצער' },
  { type: 'empty', text: '' },
  { type: 'lyric', text: 'אבל הכל חולף' },
  { type: 'lyric', text: 'והזמן ממשיך לזרום' },
  { type: 'lyric', text: 'כמו נהר שאינו נח' },
  { type: 'lyric', text: 'לוקח הכל איתו' },
  { type: 'lyric', text: 'אל עבר הים הגדול' },
  { type: 'empty', text: '' },
  { type: 'lyric', text: 'ואני עומד כאן' },
  { type: 'lyric', text: 'לבד עם המחשבות' },
  { type: 'lyric', text: 'שואל את עצמי' },
  { type: 'lyric', text: 'לאן אני הולך' },
  { type: 'lyric', text: 'מה אני מחפש' },
  { type: 'empty', text: '' },
  { type: 'empty', text: '' }, // This will be filtered out (consecutive empty)
  { type: 'lyric', text: 'אולי התשובה נמצאת' },
  { type: 'lyric', text: 'בתוך הדרך עצמה' },
  { type: 'lyric', text: 'בכל צעד שאני צועד' },
  { type: 'lyric', text: 'בכל נשימה שאני נושם' },
  { type: 'empty', text: '' },
  { type: 'lyric', text: 'כי החיים הם לא יעד' },
  { type: 'lyric', text: 'אלא מסע ארוך' },
  { type: 'lyric', text: 'מלא בהפתעות' },
  { type: 'lyric', text: 'ובגילויים חדשים' },
  { type: 'lyric', text: 'בכל פינה ובכל רגע' },
  { type: 'empty', text: '' },
  { type: 'lyric', text: 'אז אני ממשיך ללכת' },
  { type: 'lyric', text: 'עם האמונה בלב' },
  { type: 'lyric', text: 'שהכל יהיה בסדר' },
  { type: 'lyric', text: 'כי השמש תמיד זורחת' },
  { type: 'lyric', text: 'אחרי הגשם' },
];

// Configuration
const LINES_PER_VERSE = 10;

export function ScrollDemoView() {
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(500);
  const [, setForceUpdate] = useState(0); // For forcing re-renders
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll animation tracking
  const isScrolling = useRef(false);
  const scrollStartPosition = useRef(0);
  const scrollTargetPosition = useRef(0);
  const scrollProgress = useRef(0);
  const fontTransitioned = useRef(false);
  const scrollFromVerseIndex = useRef(0); // Track which verse we're scrolling from

  // Filter lines for lyrics mode (removes consecutive empties, etc.)
  const filteredLines = useMemo(() => {
    return filterForLyricsMode(DEMO_SONG_LINES, true);
  }, []);

  // Calculate verses using shared algorithm from verseCalculator.ts
  const verses: VerseRange[] = useMemo(() => {
    const calculated = calculateVersesForLyricsMode(DEMO_SONG_LINES, LINES_PER_VERSE);
    console.log('📊 CALCULATED VERSES:', JSON.stringify(calculated, null, 2));
    return calculated;
  }, []);

  // Calculate font sizes per verse to fit lines in viewport
  const verseFontSizes = useMemo(() => {
    const LINE_HEIGHT = 1.35;
    const LINE_MARGIN = 3.2; // 0.1rem * 2 * 16px per line
    const PADDING = 16; // 0.5rem * 2 * 16px (minimal padding inside verse wrapper)

    return verses.map(verse => {
      const lineCount = verse.visibleLineCount;
      const availableHeight = viewportHeight - PADDING;
      const fontSize = (availableHeight - (LINE_MARGIN * lineCount)) / (lineCount * LINE_HEIGHT);

      return Math.max(18, Math.round(fontSize));
    });
  }, [verses, viewportHeight]);

  // Font transition trigger - called when scroll reaches 80%
  const triggerSharedLineFontTransition = () => {
    // Mark font transition as triggered - this will cause re-render with new fontSize
    fontTransitioned.current = true;

    // Force a re-render to apply the new font size from React
    // The component will re-render and calculate fontSize based on currentVerseIndex
    // since fontTransitioned.current is now true
    setForceUpdate(prev => prev + 1);

    const fromVerse = verses[scrollFromVerseIndex.current];
    if (fromVerse && fromVerse.sharedLineIndices && fromVerse.sharedLineIndices.length > 0) {
      console.log(`Font transition triggered at 80% for shared lines: ${fromVerse.sharedLineIndices.join(', ')}`);
    }
  };

  // Initialize Lenis smooth scroll
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const lenis = new Lenis({
      wrapper: container,
      content: container,
      duration: 2.0, // 2 second scroll duration
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Ease-out
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    // Track scroll progress for font transitions
    lenis.on('scroll', () => {
      if (isScrolling.current) {
        const start = scrollStartPosition.current;
        const target = scrollTargetPosition.current;
        const current = lenis.scroll;

        scrollProgress.current = Math.min(1, Math.max(0, (current - start) / (target - start)));

        // Trigger font transition at 80% progress
        if (scrollProgress.current >= 0.8 && !fontTransitioned.current) {
          fontTransitioned.current = true;
          triggerSharedLineFontTransition();
        }
      }
    });

    // Animation frame loop
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, [currentVerseIndex, verses, verseFontSizes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate available viewport height on mount and resize
  useEffect(() => {
    const calculateViewportHeight = () => {
      const windowHeight = window.innerHeight;
      const headerHeight = headerRef.current?.offsetHeight || 0;
      const controlsHeight = controlsRef.current?.offsetHeight || 0;
      const padding = 32; // Reduced padding
      const availableHeight = windowHeight - headerHeight - controlsHeight - padding;
      setViewportHeight(Math.max(300, availableHeight)); // Minimum 300px
    };

    calculateViewportHeight();
    window.addEventListener('resize', calculateViewportHeight);
    return () => window.removeEventListener('resize', calculateViewportHeight);
  }, []);

  // Scroll to verse when index changes
  const scrollToVerse = (verseIndex: number) => {
    const lenis = lenisRef.current;
    if (!lenis) {
      console.log('Lenis not initialized');
      return;
    }

    const targetElement = verseRefs.current[verseIndex];
    if (!targetElement) {
      console.log('Target element not found for verse', verseIndex);
      return;
    }

    console.log('Scrolling to verse', verseIndex, 'element:', targetElement);

    // Track scroll positions for progress calculation
    scrollStartPosition.current = lenis.scroll;
    scrollTargetPosition.current = targetElement.offsetTop;

    lenis.scrollTo(targetElement, {
      offset: 0,
      duration: 2.0,
      onComplete: () => {
        console.log('Scroll complete to verse', verseIndex);
        isScrolling.current = false;
      }
    });
  };

  useEffect(() => {
    // Small delay to ensure refs are populated
    const timer = setTimeout(() => {
      scrollToVerse(currentVerseIndex);
    }, 100);

    return () => clearTimeout(timer);
  }, [currentVerseIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goToNextVerse();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrevVerse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentVerseIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToNextVerse = () => {
    if (currentVerseIndex < verses.length - 1) {
      scrollFromVerseIndex.current = currentVerseIndex; // Capture current verse before changing
      isScrolling.current = true; // Mark as scrolling before state change
      fontTransitioned.current = false; // Reset font transition flag
      setCurrentVerseIndex(currentVerseIndex + 1);
    }
  };

  const goToPrevVerse = () => {
    if (currentVerseIndex > 0) {
      scrollFromVerseIndex.current = currentVerseIndex; // Capture current verse before changing
      isScrolling.current = true; // Mark as scrolling before state change
      fontTransitioned.current = false; // Reset font transition flag
      setCurrentVerseIndex(currentVerseIndex - 1);
    }
  };

  const isAtFirst = currentVerseIndex === 0;
  const isAtLast = currentVerseIndex === verses.length - 1;

  return (
    <div className="scroll-demo-view">
      <div className="scroll-demo-header" ref={headerRef}>
        <h1>ScrollView Verse Navigation Demo</h1>
      </div>

      <div className="scroll-demo-controls" ref={controlsRef}>
        <button
          onClick={goToPrevVerse}
          disabled={isAtFirst}
          className="demo-nav-btn"
        >
          ◀ פסוק קודם
        </button>
        <div className="verse-indicator">
          פסוק {currentVerseIndex + 1} / {verses.length}
        </div>
        <button
          onClick={goToNextVerse}
          disabled={isAtLast}
          className="demo-nav-btn"
        >
          פסוק הבא ▶
        </button>
      </div>

      <div className="scroll-demo-container" ref={scrollContainerRef}>
        <div className="continuous-lines-container" style={{ padding: '0.5rem 1.5rem' }}>
          {filteredLines.map((line, lineIndex) => {
            // Determine which verses this line belongs to
            const belongsToVerses: number[] = [];
            let isSharedLine = false;
            const verseStarts: number[] = []; // Which verses start at this line

            for (let v = 0; v < verses.length; v++) {
              const verse = verses[v];
              if (lineIndex >= verse.startIndex && lineIndex <= verse.endIndex) {
                belongsToVerses.push(v);

                // Check if this line is the start of this verse
                if (lineIndex === verse.startIndex) {
                  verseStarts.push(v);
                  console.log(`Line ${lineIndex} is verse ${v} start`);
                }
                // Check if this is a shared line (appears in verse boundary)
                if (verse.sharedLineIndices && verse.sharedLineIndices.includes(lineIndex)) {
                  isSharedLine = true;
                  console.log(`🟡 Line ${lineIndex} is SHARED (verse ${v}):`, filteredLines[lineIndex].text.substring(0, 30));
                }
              }
            }

            if (belongsToVerses.length === 0) return null;

            // Determine font size based on current verse being viewed
            let fontSize: number;
            if (isSharedLine && belongsToVerses.length === 2) {
              // Shared line: use font size based on which verse we're currently viewing
              const [verse1, verse2] = belongsToVerses;

              // During scroll animation, use the verse we're scrolling FROM until font transition triggers
              const effectiveVerseIndex = isScrolling.current && !fontTransitioned.current
                ? scrollFromVerseIndex.current
                : currentVerseIndex;

              if (effectiveVerseIndex <= verse1) {
                fontSize = verseFontSizes[verse1]; // Use first verse's font
              } else {
                fontSize = verseFontSizes[verse2]; // Use second verse's font
              }
            } else {
              // Regular line: use its verse's font size
              fontSize = verseFontSizes[belongsToVerses[0]];
            }

            // Calculate padding to ensure previous verse fills exactly viewportHeight
            let paddingBefore = 0;
            if (verseStarts.length > 0 && verseStarts[0] > 0) {
              const firstVerseStart = verseStarts[0];
              const prevVerse = verses[firstVerseStart - 1];
              const prevVerseLineCount = prevVerse.endIndex - prevVerse.startIndex + 1;
              const LINE_HEIGHT = 1.35;
              const LINE_MARGIN = 3.2;
              const CONTAINER_PADDING = 16; // 0.5rem * 2 * 16px

              const prevVerseFontSize = verseFontSizes[firstVerseStart - 1];

              // Calculate exact content height: each line takes (fontSize * lineHeight) + margin
              const totalLineHeight = prevVerseLineCount * prevVerseFontSize * LINE_HEIGHT;
              const totalMargin = prevVerseLineCount * LINE_MARGIN;
              const prevVerseContentHeight = totalLineHeight + totalMargin;

              // Available height for verse content (excluding container padding)
              const availableHeight = viewportHeight - CONTAINER_PADDING;

              // Add spacer to fill remaining space, plus a tiny bit extra to prevent bleeding
              paddingBefore = Math.max(0, Math.ceil(availableHeight - prevVerseContentHeight) + 2);
            }

            return (
              <div key={lineIndex}>
                {paddingBefore > 0 && (
                  <div style={{ height: `${paddingBefore}px` }} className="verse-spacer" />
                )}
                <div
                  className={`demo-line ${line.type === 'empty' ? 'line-empty' : ''} ${isSharedLine ? 'shared-line' : ''}`}
                  data-global-index={lineIndex}
                  data-is-shared={isSharedLine}
                  data-verses={belongsToVerses.join(',')}
                  ref={el => {
                    // Set ref for ALL verses that start at this line
                    verseStarts.forEach(v => {
                      verseRefs.current[v] = el;
                    });
                  }}
                  style={{
                    fontSize: `${fontSize}px`,
                    ...(isSharedLine ? { transition: 'font-size 0.3s ease' } : {})
                  }}
                >
                  {line.type === 'empty' ? '\u00A0' : line.text}
                  {isSharedLine && (
                    <span className="shared-indicator" style={{ fontSize: '0.6em' }}>
                      {' '}[shared: {belongsToVerses.join(',')}]{' '}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Verse labels */}
        <div className="verse-label">
          פסוק {currentVerseIndex + 1} / {verses.length} ({verseFontSizes[currentVerseIndex]}px, {viewportHeight}px)
          <br />
          <small style={{ fontSize: '0.6em' }}>
            Verse {currentVerseIndex}: lines {verses[currentVerseIndex].startIndex}-{verses[currentVerseIndex].endIndex} ({verses[currentVerseIndex].visibleLineCount} lines)
            {verses[currentVerseIndex].sharedLineIndices && verses[currentVerseIndex].sharedLineIndices!.length > 0 && (
              <>, shared: [{verses[currentVerseIndex].sharedLineIndices!.join(', ')}]</>
            )}
          </small>
        </div>
      </div>
    </div>
  );
}

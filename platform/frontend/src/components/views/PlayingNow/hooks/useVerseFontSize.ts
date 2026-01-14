import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook for verse-mode font sizing - single column, maximize for readability
 * @param containerRef - Reference to the container element
 * @param deps - Dependencies to trigger recalculation
 * @param isTransitioning - When true, measure incoming verse content and animate font size change
 * @param isPartialScroll - When true, skip animation (DOM content during partial scroll is merged, not final)
 * @param songId - Used to detect song changes and reset font size
 * @param isLoading - When true, skip font calculations (content is stale)
 */
export function useVerseFontSize(
  containerRef: React.RefObject<HTMLDivElement | null>,
  deps: unknown[],
  isTransitioning: boolean = false,
  isPartialScroll: boolean = false,
  songId: number | null = null,
  isLoading: boolean = false
) {
  // Track current font size to enable smooth transitions
  const currentFontSizeRef = useRef<number>(40);
  const prevTransitioningRef = useRef(isTransitioning);
  const prevSongIdRef = useRef(songId);
  // Hidden measurement container - created once and reused
  const measureContainerRef = useRef<HTMLDivElement | null>(null);

  // Reset font size when song changes
  useEffect(() => {
    if (songId !== prevSongIdRef.current) {
      // Song changed - reset to default size immediately
      const container = containerRef.current;
      if (container) {
        container.classList.add('measuring'); // Disable transition
        container.style.setProperty('--dynamic-font-size', '40px');
        container.classList.remove('measuring');
      }
      currentFontSizeRef.current = 40;
      prevSongIdRef.current = songId;
    }
  }, [songId, containerRef]);

  // Get or create hidden measurement container
  // CRITICAL: Append to container.parentElement (not document.body) to preserve CSS context
  const getMeasureContainer = useCallback((container: HTMLDivElement): HTMLDivElement | null => {
    const containerStyle = getComputedStyle(container);
    const parent = container.parentElement;
    if (!parent) return null;

    // Remove old container if it exists in wrong parent
    if (measureContainerRef.current && measureContainerRef.current.parentElement !== parent) {
      measureContainerRef.current.remove();
      measureContainerRef.current = null;
    }

    if (!measureContainerRef.current) {
      const measureDiv = document.createElement('div');
      parent.appendChild(measureDiv);
      measureContainerRef.current = measureDiv;
    }

    const measureDiv = measureContainerRef.current;
    // Copy all relevant styles from the real container
    measureDiv.className = container.className + ' measuring';
    measureDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      pointer-events: none;
      left: -9999px;
      top: 0;
      width: ${container.clientWidth}px;
      height: ${container.clientHeight}px;
      overflow: visible;
      font-family: ${containerStyle.fontFamily};
      padding: ${containerStyle.padding};
      line-height: ${containerStyle.lineHeight};
      column-count: 1;
    `;

    return measureDiv;
  }, []);

  // Cleanup measurement container on unmount
  useEffect(() => {
    return () => {
      if (measureContainerRef.current) {
        measureContainerRef.current.remove();
        measureContainerRef.current = null;
      }
    };
  }, []);

  // Calculate optimal font size using hidden measurement container
  const calculateOptimalSize = useCallback((content: Element, container: HTMLDivElement): number => {
    const measureContainer = getMeasureContainer(container);
    if (!measureContainer) return 40; // Fallback if no parent

    // Copy content to measurement container
    measureContainer.innerHTML = content.innerHTML;

    // Apply nowrap to lines for horizontal overflow detection
    // (Using inline styles to avoid polluting global CSS)
    const lines = measureContainer.querySelectorAll('.line');
    lines.forEach(line => {
      (line as HTMLElement).style.whiteSpace = 'nowrap';
    });

    const availableHeight = container.clientHeight;
    const availableWidth = container.clientWidth;

    // Binary search for optimal font size
    let min = 16;
    let max = 80;
    let optimalSize = 40; // Start with reasonable default

    while (min <= max) {
      const mid = Math.floor((min + max) / 2);
      measureContainer.style.setProperty('--dynamic-font-size', `${mid}px`);
      void measureContainer.offsetHeight; // Force reflow

      // Check vertical fit using scrollHeight
      const fitsVertically = measureContainer.scrollHeight <= availableHeight + 2;

      // Check horizontal fit using getBoundingClientRect on text spans
      // This is more reliable than scrollWidth for inline elements
      let fitsHorizontally = true;
      const textSpans = measureContainer.querySelectorAll('.lyric, .cue, .chords');
      for (const span of textSpans) {
        const spanWidth = span.getBoundingClientRect().width;
        if (spanWidth > availableWidth) {
          fitsHorizontally = false;
          break;
        }
      }

      if (fitsVertically && fitsHorizontally) {
        optimalSize = mid;
        min = mid + 1;
      } else {
        max = mid - 1;
      }
    }

    // Ensure we never return a tiny font (minimum 20px for readability)
    return Math.max(optimalSize, 20);
  }, [getMeasureContainer]);

  const calculateFontSize = useCallback((measureIncoming: boolean = false): boolean => {
    const container = containerRef.current;
    if (!container) return false;

    // Require minimum dimensions for accurate measurement
    if (container.clientHeight < 100 || container.clientWidth < 100) return false;

    container.style.columnCount = '1';

    // Determine what content to measure
    let contentToMeasure: Element | null = null;
    if (measureIncoming) {
      contentToMeasure = container.querySelector('.verse-content.incoming');
    }
    if (!contentToMeasure) {
      contentToMeasure = container;
    }

    // Check if there's content to measure - look for .line elements
    const lineElements = contentToMeasure.querySelectorAll('.line');
    if (lineElements.length === 0) return false; // No content yet

    // Also verify there's actual text content
    const textSpans = contentToMeasure.querySelectorAll('.lyric, .cue');
    if (textSpans.length === 0) return false;

    // Calculate optimal size using hidden container (doesn't affect visible display)
    const optimalSize = calculateOptimalSize(contentToMeasure, container);

    // If this is for a transition, animate from current to optimal
    if (measureIncoming && optimalSize !== currentFontSizeRef.current) {
      // Set the target size - CSS transition will animate from current to target
      container.style.setProperty('--dynamic-font-size', `${optimalSize}px`);
      currentFontSizeRef.current = optimalSize;
    } else if (!measureIncoming) {
      // Direct set (no animation needed)
      container.classList.add('measuring'); // Disable transition
      container.style.setProperty('--dynamic-font-size', `${optimalSize}px`);
      container.classList.remove('measuring');
      currentFontSizeRef.current = optimalSize;
    }

    return true;
  }, [containerRef, calculateOptimalSize]);

  useEffect(() => {
    // Skip all calculations while loading - content is stale/changing
    if (isLoading) return;

    const wasTransitioning = prevTransitioningRef.current;
    prevTransitioningRef.current = isTransitioning;

    let retryCount = 0;
    const maxRetries = 15; // More retries for initial load
    let timeoutIds: ReturnType<typeof setTimeout>[] = [];

    const attemptCalculation = (measureIncoming: boolean) => {
      const success = calculateFontSize(measureIncoming);
      if (!success && retryCount < maxRetries) {
        retryCount++;
        // Exponential backoff: 50ms, 100ms, 150ms, 200ms...
        const delay = 50 * retryCount;
        const id = setTimeout(() => attemptCalculation(measureIncoming), delay);
        timeoutIds.push(id);
      }
    };

    if (isTransitioning && !wasTransitioning) {
      // Transition just STARTED
      // Skip animated font change for partial scroll (DOM content is merged, not representative of final verse)
      if (!isPartialScroll) {
        const id = setTimeout(() => {
          calculateFontSize(true);
        }, 50);
        timeoutIds.push(id);
      }
    } else if (!isTransitioning && wasTransitioning) {
      // Transition just ENDED - ensure final size is accurate
      requestAnimationFrame(() => {
        calculateFontSize(false);
      });
    } else if (!isTransitioning) {
      // Normal state - initial load or content change
      // attemptCalculation has built-in retry with exponential backoff
      const initialId = setTimeout(() => attemptCalculation(false), 50);
      timeoutIds.push(initialId);
    }

    const handleResize = () => {
      if (!isTransitioning && !isLoading) {
        requestAnimationFrame(() => calculateFontSize(false));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateFontSize, isTransitioning, isPartialScroll, isLoading, ...deps]);
}

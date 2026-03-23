import { useCallback, useEffect } from 'react';

/**
 * Set column count with vendor prefixes for older browsers (Safari/iOS)
 */
function setColumnCount(element: HTMLElement, count: number): void {
  const value = String(count);
  // Standard
  element.style.columnCount = value;
  // Webkit (older Safari, iOS)
  element.style.setProperty('-webkit-column-count', value);
  // Mozilla (older Firefox)
  element.style.setProperty('-moz-column-count', value);
}

/**
 * Hook for dynamic font sizing - finds optimal columns (1-8) + font size combination
 * to maximize readability while fitting content in the container.
 * 
 * @param containerRef - Ref to the container element with CSS column layout
 * @param deps - Dependencies that should trigger recalculation (e.g., content, display mode)
 */
export function useDynamicFontSize(
  containerRef: React.RefObject<HTMLDivElement | null>,
  deps: unknown[]
) {
  const calculateOptimalLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Cap at window.innerHeight: if the container's flex height is not properly bounded
    // (e.g., due to browser quirks with position:fixed ancestors), clientHeight can grow
    // to match the content height. That makes fitsVertically trivially true at every font
    // size, so the algorithm picks the maximum font and only the first few lines are visible.
    const availableHeight = Math.min(container.clientHeight, window.innerHeight);
    const availableWidth = container.clientWidth;
    if (availableHeight === 0 || availableWidth === 0) return;
    
    // Get container padding and gap for accurate width calculation
    const containerStyle = getComputedStyle(container);
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(containerStyle.paddingRight) || 0;
    // Try both standard and webkit property for column gap
    const columnGap = parseFloat(containerStyle.columnGap) || 
                      parseFloat(containerStyle.getPropertyValue('-webkit-column-gap')) || 16;
    
    // Try each column count from 8 down to 1, find best font size for each
    // More columns = narrower columns but potentially larger font if content fits
    let bestColumns = 1;
    let bestFontSize = 6;
    
    for (let cols = 8; cols >= 1; cols--) {
      setColumnCount(container, cols);
      
      // Calculate actual column width accounting for gaps
      const totalGaps = (cols - 1) * columnGap;
      const columnWidth = (availableWidth - paddingLeft - paddingRight - totalGaps) / cols;
      
      // Binary search for optimal font size with this column count
      let min = 6;
      let max = 60;
      let optimalForCols = 6;
      
      while (min <= max) {
        const mid = Math.floor((min + max) / 2);
        // Set font size directly as well as CSS variable for older browser fallback
        container.style.setProperty('--dynamic-font-size', `${mid}px`);
        container.style.fontSize = `${mid}px`;
        void container.offsetHeight;
        
        // Check vertical fit
        const fitsVertically = container.scrollHeight <= availableHeight + 5;

        // Check that all CSS columns fit in the visible width (no columns overflowing off-screen).
        // With multi-column layout, scrollHeight stays equal to clientHeight even when extra
        // columns are generated beyond the container width. scrollWidth includes those extra
        // columns, so this catches hidden column overflow that fitsVertically misses.
        const fitsAllColumnsVisible = container.scrollWidth <= availableWidth + 5;

        // Check horizontal fit - measure actual text span widths against column width
        const textSpans = container.querySelectorAll('.lyric, .cue, .chords');
        let fitsHorizontally = true;
        for (const span of textSpans) {
          const spanWidth = span.getBoundingClientRect().width;
          if (spanWidth > columnWidth) {
            fitsHorizontally = false;
            break;
          }
        }

        if (fitsVertically && fitsHorizontally && fitsAllColumnsVisible) {
          optimalForCols = mid;
          min = mid + 1;
        } else {
          max = mid - 1;
        }
      }
      
      // If this column count gives a better (larger) font, use it
      if (optimalForCols > bestFontSize) {
        bestFontSize = optimalForCols;
        bestColumns = cols;
      }
    }
    
    // Apply the best combination with vendor prefixes
    setColumnCount(container, bestColumns);
    container.style.setProperty('--dynamic-font-size', `${bestFontSize}px`);
    container.style.fontSize = `${bestFontSize}px`;
  }, [containerRef]);
  
  useEffect(() => {
    const timeoutId = setTimeout(calculateOptimalLayout, 50);
    
    const handleResize = () => {
      requestAnimationFrame(calculateOptimalLayout);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateOptimalLayout, ...deps]);
}


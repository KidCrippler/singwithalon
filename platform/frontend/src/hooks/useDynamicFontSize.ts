import { useCallback, useEffect } from 'react';

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
    
    const availableHeight = container.clientHeight;
    const availableWidth = container.clientWidth;
    if (availableHeight === 0 || availableWidth === 0) return;
    
    // Get container padding and gap for accurate width calculation
    const containerStyle = getComputedStyle(container);
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(containerStyle.paddingRight) || 0;
    const columnGap = parseFloat(containerStyle.columnGap) || 16;
    
    // Try each column count from 8 down to 1, find best font size for each
    // More columns = narrower columns but potentially larger font if content fits
    let bestColumns = 1;
    let bestFontSize = 6;
    
    for (let cols = 8; cols >= 1; cols--) {
      container.style.columnCount = String(cols);
      
      // Calculate actual column width accounting for gaps
      const totalGaps = (cols - 1) * columnGap;
      const columnWidth = (availableWidth - paddingLeft - paddingRight - totalGaps) / cols;
      
      // Binary search for optimal font size with this column count
      let min = 6;
      let max = 60;
      let optimalForCols = 6;
      
      while (min <= max) {
        const mid = Math.floor((min + max) / 2);
        container.style.setProperty('--dynamic-font-size', `${mid}px`);
        void container.offsetHeight;
        
        // Check vertical fit
        const fitsVertically = container.scrollHeight <= availableHeight + 5;
        
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
        
        if (fitsVertically && fitsHorizontally) {
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
    
    // Apply the best combination
    container.style.columnCount = String(bestColumns);
    container.style.setProperty('--dynamic-font-size', `${bestFontSize}px`);
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

